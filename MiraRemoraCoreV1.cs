using System;
using System.Collections.Concurrent;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using cAlgo.API;
using cAlgo.API.Indicators;

namespace cAlgo.Robots
{
    [Robot(AccessRights = AccessRights.FullAccess)]
    public class MiraRemoraCore : Robot
    {
        [Parameter("Webhook URL", DefaultValue = "https://remora-henna-chi.vercel.app/api/ingest/ctrader")]
        public string WebhookUrl { get; set; }

        [Parameter("Strategy Name", DefaultValue = "Mira Remora Core")]
        public string StrategyName { get; set; }

        [Parameter("Strategy Version", DefaultValue = "v1")]
        public string StrategyVersion { get; set; }

        private static readonly HttpClient Client = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(10)
        };

        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        private readonly ConcurrentDictionary<int, double> _maeTracker = new ConcurrentDictionary<int, double>();
        private readonly ConcurrentDictionary<int, double> _mfeTracker = new ConcurrentDictionary<int, double>();
        private CancellationTokenSource _shutdownCts;
        private AverageTrueRange _atr;

        protected override void OnStart()
        {
            _shutdownCts = new CancellationTokenSource();

            _atr = Indicators.AverageTrueRange(14, MovingAverageType.Exponential);

            Client.DefaultRequestHeaders.Accept.Clear();
            Client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            LogInfo("bot_started", null, new
            {
                webhook_url = WebhookUrl,
                strategy_name = StrategyName,
                strategy_version = StrategyVersion
            });

            Positions.Opened += OnPositionsOpened;
            Positions.Closed += OnPositionsClosed;
        }

        private void OnPositionsOpened(PositionOpenedEventArgs args)
        {
            var position = args.Position;
            _maeTracker[position.Id] = 0d;
            _mfeTracker[position.Id] = 0d;

            LogInfo("position_opened", position, new { stage = TradeStage.Open });

            _ = PublishPositionAsync(
                position,
                TradeStage.Open,
                maePips: 0d,
                mfePips: 0d,
                cancellationToken: _shutdownCts.Token);
        }

        protected override void OnTick()
        {
            foreach (var position in Positions)
            {
                if (!_maeTracker.ContainsKey(position.Id))
                {
                    continue;
                }

                var pipsPnL = position.Pips;

                _mfeTracker.AddOrUpdate(
                    position.Id,
                    pipsPnL,
                    (_, current) => pipsPnL > current ? pipsPnL : current);

                _maeTracker.AddOrUpdate(
                    position.Id,
                    pipsPnL,
                    (_, current) => pipsPnL < current ? pipsPnL : current);
            }
        }

        private void OnPositionsClosed(PositionClosedEventArgs args)
        {
            var position = args.Position;
            _maeTracker.TryGetValue(position.Id, out var trackedMae);
            _mfeTracker.TryGetValue(position.Id, out var trackedMfe);

            var finalMae = Math.Abs(trackedMae);
            var finalMfe = trackedMfe;

            LogInfo("position_closed", position, new
            {
                stage = TradeStage.Close,
                mae_pips = finalMae,
                mfe_pips = finalMfe
            });

            _ = PublishPositionAsync(
                position,
                TradeStage.Close,
                maePips: finalMae,
                mfePips: finalMfe,
                cancellationToken: _shutdownCts.Token);

            _maeTracker.TryRemove(position.Id, out _);
            _mfeTracker.TryRemove(position.Id, out _);
        }

        private async Task PublishPositionAsync(
            Position position,
            TradeStage stage,
            double maePips,
            double mfePips,
            CancellationToken cancellationToken)
        {
            try
            {
                Print($"[REMORA] SL={position.StopLoss}");
                Print($"[REMORA] TP={position.TakeProfit}");

                var payload = BuildPayload(position, stage, maePips, mfePips);
                var json = JsonSerializer.Serialize(payload, JsonOptions);

                Print("=== REMORA PAYLOAD ===");
                Print(json);

                using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
                using (var response = await Client.PostAsync(WebhookUrl, content, cancellationToken).ConfigureAwait(false))
                {
                    if (!response.IsSuccessStatusCode)
                    {
                        var body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                        LogWarn("publish_failed", position, new
                        {
                            stage,
                            status_code = (int)response.StatusCode,
                            response_body = body
                        });
                        return;
                    }
                }

                LogInfo("publish_success", position, new { stage });
            }
            catch (OperationCanceledException)
            {
                LogInfo("publish_cancelled", position, new { stage });
            }
            catch (Exception ex)
            {
                LogError("publish_exception", position, ex, new { stage });
            }
        }

        private RemoraPayload BuildPayload(Position position, TradeStage stage, double maePips, double mfePips)
        {
            var nowUtc = Server.Time.ToUniversalTime();
            var openedAt = position.EntryTime.ToUniversalTime();
            DateTime? closedAt = stage == TradeStage.Close ? nowUtc : (DateTime?)null;
            var spread = position.SymbolName == SymbolName ? Symbol.Spread / Symbol.PipSize : 0d;
            var symbol = Symbols.GetSymbol(position.SymbolName);
            var pipSize = symbol != null ? symbol.PipSize : 0d;
            double? exitPrice = null;

            if (stage == TradeStage.Close && pipSize > 0d)
            {
                var signedDelta = position.Pips * pipSize;
                exitPrice = position.TradeType == TradeType.Buy
                    ? position.EntryPrice + signedDelta
                    : position.EntryPrice - signedDelta;
            }

            double? riskPips = null;
            double? rewardPips = null;
            double? rrRatio = null;

            if (position.StopLoss.HasValue && pipSize > 0d)
            {
                riskPips = Math.Abs(position.EntryPrice - position.StopLoss.Value) / pipSize;
            }

            if (position.TakeProfit.HasValue && pipSize > 0d)
            {
                rewardPips = Math.Abs(position.TakeProfit.Value - position.EntryPrice) / pipSize;
            }

            if (riskPips.HasValue && rewardPips.HasValue && riskPips.Value > 0d)
            {
                rrRatio = rewardPips.Value / riskPips.Value;
            }

            return new RemoraPayload
            {
                SourcePlatform = "ctrader",
                TicketId = position.Id.ToString(),
                Stage = stage == TradeStage.Open ? "OPEN" : "CLOSE",
                StrategyName = StrategyName,
                StrategyVersion = StrategyVersion,
                SessionName = CalculateSessionName(nowUtc),
                Symbol = position.SymbolName,
                Action = position.TradeType == TradeType.Buy ? "long" : "short",
                EntryPrice = position.EntryPrice,
                ExitPrice = exitPrice,
                StopLoss = position.StopLoss,
                TakeProfit = position.TakeProfit,
                Volume = position.VolumeInUnits,
                GrossProfit = position.GrossProfit,
                NetProfit = position.NetProfit,
                Commission = position.Commissions,
                SwapFee = position.Swap,
                Spread = spread,
                Atr = _atr != null ? _atr.Result.LastValue : (double?)null,
                RiskPips = riskPips,
                RewardPips = rewardPips,
                RRRatio = rrRatio,
                MaePips = maePips,
                MfePips = mfePips,
                OpenedAt = openedAt,
                ClosedAt = closedAt,
                Result = stage == TradeStage.Close ? (position.NetProfit >= 0 ? "win" : "loss") : "open",
                Metadata = new PayloadMetadata
                {
                    PositionLabel = position.Label,
                    PositionComment = position.Comment
                }
            };
        }

        private static string CalculateSessionName(DateTime utcNow)
        {
            var hour = utcNow.Hour;
            if (hour >= 0 && hour < 8)
            {
                return "ASIA";
            }

            if (hour >= 8 && hour < 16)
            {
                return "LONDON";
            }

            return "NEW_YORK";
        }

        private void LogInfo(string eventName, Position position, object context)
        {
            Log("INFO", eventName, position, null, context);
        }

        private void LogWarn(string eventName, Position position, object context)
        {
            Log("WARN", eventName, position, null, context);
        }

        private void LogError(string eventName, Position position, Exception exception, object context)
        {
            Log("ERROR", eventName, position, exception, context);
        }

        private void Log(string level, string eventName, Position position, Exception exception, object context)
        {
            var log = new
            {
                ts = DateTime.UtcNow.ToString("O"),
                level,
                event_name = eventName,
                position_id = position != null ? position.Id : (int?)null,
                symbol = position != null ? position.SymbolName : null,
                context,
                error = exception == null
                    ? null
                    : new
                    {
                        type = exception.GetType().Name,
                        message = exception.Message
                    }
            };

            Print(JsonSerializer.Serialize(log, JsonOptions));
        }

        protected override void OnStop()
        {
            Positions.Opened -= OnPositionsOpened;
            Positions.Closed -= OnPositionsClosed;

            if (_shutdownCts != null)
            {
                _shutdownCts.Cancel();
                _shutdownCts.Dispose();
                _shutdownCts = null;
            }

            LogInfo("bot_stopped", null, null);
        }

        private enum TradeStage
        {
            Open,
            Close
        }

        private sealed class RemoraPayload
        {
            [JsonPropertyName("source_platform")]
            public string SourcePlatform { get; set; }

            [JsonPropertyName("ticket_id")]
            public string TicketId { get; set; }

            [JsonPropertyName("stage")]
            public string Stage { get; set; }

            [JsonPropertyName("strategy_name")]
            public string StrategyName { get; set; }

            [JsonPropertyName("strategy_version")]
            public string StrategyVersion { get; set; }

            [JsonPropertyName("session_name")]
            public string SessionName { get; set; }

            [JsonPropertyName("symbol")]
            public string Symbol { get; set; }

            [JsonPropertyName("action")]
            public string Action { get; set; }

            [JsonPropertyName("entry_price")]
            public double EntryPrice { get; set; }

            [JsonPropertyName("exit_price")]
            public double? ExitPrice { get; set; }

            [JsonPropertyName("stop_loss")]
            public double? StopLoss { get; set; }

            [JsonPropertyName("take_profit")]
            public double? TakeProfit { get; set; }

            [JsonPropertyName("volume")]
            public double Volume { get; set; }

            [JsonPropertyName("gross_profit")]
            public double GrossProfit { get; set; }

            [JsonPropertyName("net_profit")]
            public double NetProfit { get; set; }

            [JsonPropertyName("commission")]
            public double Commission { get; set; }

            [JsonPropertyName("swap_fee")]
            public double SwapFee { get; set; }

            [JsonPropertyName("spread")]
            public double Spread { get; set; }

            [JsonPropertyName("atr")]
            public double? Atr { get; set; }

            [JsonPropertyName("risk_pips")]
            public double? RiskPips { get; set; }

            [JsonPropertyName("reward_pips")]
            public double? RewardPips { get; set; }

            [JsonPropertyName("rr_ratio")]
            public double? RRRatio { get; set; }

            [JsonPropertyName("mae_pips")]
            public double MaePips { get; set; }

            [JsonPropertyName("mfe_pips")]
            public double MfePips { get; set; }

            [JsonPropertyName("opened_at")]
            public DateTime OpenedAt { get; set; }

            [JsonPropertyName("closed_at")]
            public DateTime? ClosedAt { get; set; }

            [JsonPropertyName("result")]
            public string Result { get; set; }

            [JsonPropertyName("metadata")]
            public PayloadMetadata Metadata { get; set; }
        }

        private sealed class PayloadMetadata
        {
            [JsonPropertyName("position_label")]
            public string PositionLabel { get; set; }

            [JsonPropertyName("position_comment")]
            public string PositionComment { get; set; }
        }
    }
}