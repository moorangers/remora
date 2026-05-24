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
using cAlgo.API.Internals;
using cAlgo.API.Indicators;

namespace cAlgo.Robots
{
    [Robot(AccessRights = AccessRights.FullAccess)]
    public class MiraRemoraCore : Robot
    {
        [Parameter("Webhook URL", DefaultValue = "http://localhost:3000/api/ingest/ctrader")]
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
            DefaultIgnoreCondition = JsonIgnoreCondition.Never
        };

        private readonly ConcurrentDictionary<int, PositionAnalyticsState> _positionStates =
            new ConcurrentDictionary<int, PositionAnalyticsState>();

        private CancellationTokenSource _shutdownCts;
        private AverageTrueRange _atr;

        protected override void OnStart()
        {
            _shutdownCts = new CancellationTokenSource();
            _atr = Indicators.AverageTrueRange(14, MovingAverageType.Exponential);

            Client.DefaultRequestHeaders.Accept.Clear();
            Client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            Positions.Opened += OnPositionOpened;
            Positions.Closed += OnPositionClosed;

            LogInfo(LogEvent.BotStarted, null, new
            {
                webhook_url = WebhookUrl,
                strategy_name = StrategyName,
                strategy_version = StrategyVersion,
                atr_period = 14,
                atr_ma_type = "EMA"
            });
        }

        private void OnPositionOpened(PositionOpenedEventArgs args)
        {
            var position = args.Position;
            var atrAtOpen = GetAtrValue();

            _positionStates[position.Id] = new PositionAnalyticsState
            {
                MaePips = 0d,
                MfePips = 0d,
                AtrAtOpen = atrAtOpen
            };

            LogInfo(LogEvent.PositionOpened, position, new
            {
                stage = TradeStage.Open,
                atr_at_open = atrAtOpen
            });

            _ = PublishPositionAsync(
                position,
                TradeStage.Open,
                cancellationToken: _shutdownCts.Token);
        }

        protected override void OnTick()
        {
            foreach (var position in Positions)
            {
                if (!_positionStates.ContainsKey(position.Id))
                {
                    continue;
                }

                var currentPips = position.Pips;

                _positionStates.AddOrUpdate(
                    position.Id,
                    _ => new PositionAnalyticsState
                    {
                        MaePips = Math.Min(0d, currentPips),
                        MfePips = Math.Max(0d, currentPips),
                        AtrAtOpen = GetAtrValue()
                    },
                    (_, state) =>
                    {
                        state.MaePips = Math.Min(state.MaePips, currentPips);
                        state.MfePips = Math.Max(state.MfePips, currentPips);
                        return state;
                    });
            }
        }

        private async void OnPositionClosed(PositionClosedEventArgs args)
        {
            var position = args.Position;

            if (!_positionStates.ContainsKey(position.Id))
            {
                _positionStates[position.Id] = new PositionAnalyticsState
                {
                    MaePips = Math.Min(0d, position.Pips),
                    MfePips = Math.Max(0d, position.Pips),
                    AtrAtOpen = GetAtrValue()
                };

                LogWarn(LogEvent.PositionClosed, position, new
                {
                    warning = "analytics_state_missing_recreated_from_closed_position"
                });
            }

            var state = _positionStates[position.Id];

            LogInfo(LogEvent.PositionClosed, position, new
            {
                stage = TradeStage.Close,
                mae_pips = Math.Abs(state.MaePips),
                mfe_pips = state.MfePips,
                atr_at_open = state.AtrAtOpen
            });

            try
            {
                await PublishPositionAsync(
                    position,
                    TradeStage.Close,
                    cancellationToken: _shutdownCts.Token);
            }
            finally
            {
                PositionAnalyticsState removedState;
                _positionStates.TryRemove(position.Id, out removedState);
            }
        }

        private async Task PublishPositionAsync(
            Position position,
            TradeStage stage,
            CancellationToken cancellationToken)
        {
            try
            {
                var payload = BuildPayload(position, stage);
                var json = JsonSerializer.Serialize(payload, JsonOptions);

                LogInfo(LogEvent.PayloadCreated, position, new
                {
                    stage,
                    payload = payload
                });

                LogInfo(LogEvent.WebhookSent, position, new
                {
                    stage,
                    webhook_url = WebhookUrl
                });

                using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
                using (var response = await Client.PostAsync(WebhookUrl, content, cancellationToken).ConfigureAwait(false))
                {
                    var responseBody = await response.Content.ReadAsStringAsync().ConfigureAwait(false);

                    if (!response.IsSuccessStatusCode)
                    {
                        LogWarn(LogEvent.WebhookFailed, position, new
                        {
                            stage,
                            status_code = (int)response.StatusCode,
                            response_body = responseBody
                        });
                        return;
                    }

                    LogInfo(LogEvent.WebhookSuccess, position, new
                    {
                        stage,
                        status_code = (int)response.StatusCode,
                        response_body = responseBody
                    });
                }
            }
            catch (OperationCanceledException)
            {
                LogWarn(LogEvent.WebhookFailed, position, new
                {
                    stage,
                    reason = "operation_cancelled"
                });
            }
            catch (Exception ex)
            {
                LogError(LogEvent.WebhookFailed, position, ex, new
                {
                    stage
                });
            }
        }

        private RemoraPayload BuildPayload(Position position, TradeStage stage)
        {
            var nowUtc = Server.Time.ToUniversalTime();
            var openedAt = position.EntryTime.ToUniversalTime();
            var symbol = Symbols.GetSymbol(position.SymbolName);
            var pipSize = symbol != null ? symbol.PipSize : Symbol.PipSize;

            PositionAnalyticsState state;
            _positionStates.TryGetValue(position.Id, out state);

            var maePips = state != null ? Math.Abs(state.MaePips) : 0d;
            var mfePips = state != null ? state.MfePips : 0d;
            var atrAtOpen = state != null ? state.AtrAtOpen : GetAtrValue();

            double? exitPrice = null;
            if (stage == TradeStage.Close && pipSize > 0d)
            {
                var signedDelta = position.Pips * pipSize;
                exitPrice = position.TradeType == TradeType.Buy
                    ? position.EntryPrice + signedDelta
                    : position.EntryPrice - signedDelta;
            }

            var spreadPips = GetSpreadPips(position.SymbolName, symbol);
            var riskPips = CalculateRiskPips(position, pipSize);
            var rewardPips = CalculateRewardPips(position, pipSize);
            double? rrRatio = null;

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
                Spread = spreadPips,
                Atr = atrAtOpen,
                RiskPips = riskPips,
                RewardPips = rewardPips,
                RRRatio = rrRatio,
                MaePips = maePips,
                MfePips = mfePips,
                OpenedAt = openedAt,
                ClosedAt = stage == TradeStage.Close ? nowUtc : (DateTime?)null,
                Result = stage == TradeStage.Close ? (position.NetProfit >= 0d ? "win" : "loss") : "open",
                Metadata = new PayloadMetadata
                {
                    PositionLabel = position.Label,
                    PositionComment = position.Comment
                }
            };
        }

        private double? CalculateRiskPips(Position position, double pipSize)
        {
            if (!position.StopLoss.HasValue || pipSize <= 0d)
            {
                return null;
            }

            return Math.Abs(position.EntryPrice - position.StopLoss.Value) / pipSize;
        }

        private double? CalculateRewardPips(Position position, double pipSize)
        {
            if (!position.TakeProfit.HasValue || pipSize <= 0d)
            {
                return null;
            }

            return Math.Abs(position.TakeProfit.Value - position.EntryPrice) / pipSize;
        }

        private double GetSpreadPips(string positionSymbolName, Symbol positionSymbol)
        {
            if (positionSymbolName == SymbolName)
            {
                return Symbol.Spread / Symbol.PipSize;
            }

            if (positionSymbol != null && positionSymbol.PipSize > 0d)
            {
                return positionSymbol.Spread / positionSymbol.PipSize;
            }

            return 0d;
        }

        private double? GetAtrValue()
        {
            if (_atr == null)
            {
                LogWarn(LogEvent.PayloadCreated, null, new
                {
                    warning = "atr_indicator_not_initialized"
                });
                return null;
            }

            var value = _atr.Result.LastValue;

            if (double.IsNaN(value) || double.IsInfinity(value) || value <= 0d)
            {
                LogWarn(LogEvent.PayloadCreated, null, new
                {
                    warning = "atr_value_invalid_or_not_ready",
                    atr_value = value
                });
                return null;
            }

            return value;
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

        private void LogInfo(LogEvent eventName, Position position, object context)
        {
            Log("INFO", eventName, position, null, context);
        }

        private void LogWarn(LogEvent eventName, Position position, object context)
        {
            Log("WARN", eventName, position, null, context);
        }

        private void LogError(LogEvent eventName, Position position, Exception exception, object context)
        {
            Log("ERROR", eventName, position, exception, context);
        }

        private void Log(string level, LogEvent eventName, Position position, Exception exception, object context)
        {
            var log = new
            {
                ts = DateTime.UtcNow.ToString("O"),
                level,
                @event = eventName.ToString(),
                ticket_id = position != null ? position.Id.ToString() : null,
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
            Positions.Opened -= OnPositionOpened;
            Positions.Closed -= OnPositionClosed;

            if (_shutdownCts != null)
            {
                _shutdownCts.Cancel();
                _shutdownCts.Dispose();
                _shutdownCts = null;
            }

            _positionStates.Clear();

            LogInfo(LogEvent.BotStopped, null, null);
        }

        private enum TradeStage
        {
            Open,
            Close
        }

        private enum LogEvent
        {
            BotStarted,
            BotStopped,
            PositionOpened,
            PositionClosed,
            PayloadCreated,
            WebhookSent,
            WebhookSuccess,
            WebhookFailed
        }

        private sealed class PositionAnalyticsState
        {
            public double MaePips { get; set; }
            public double MfePips { get; set; }
            public double? AtrAtOpen { get; set; }
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
