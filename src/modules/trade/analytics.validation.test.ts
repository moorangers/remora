import { describe, expect, it } from 'vitest';
import {
  calculateAverageLoss,
  calculateAverageMAE,
  calculateAverageMFE,
  calculateAverageWin,
  calculateExpectancy,
  calculateNetProfit,
  calculateProfitFactor,
  calculateWinRate,
} from './analytics';
import {
  analyticsValidationDatasets,
  type MetricExpectation,
} from './analytics.validation.datasets';

type MetricKey = keyof MetricExpectation;
type MetricStatus = 'PASS' | 'FAIL';

const METRICS: readonly MetricKey[] = [
  'winRate',
  'profitFactor',
  'expectancy',
  'averageWin',
  'averageLoss',
  'averageMAE',
  'averageMFE',
  'netProfit',
] as const;

function calculateActualMetrics(
  trades: (typeof analyticsValidationDatasets)[number]['trades'],
): MetricExpectation {
  return {
    winRate: calculateWinRate(trades),
    profitFactor: calculateProfitFactor(trades),
    expectancy: calculateExpectancy(trades),
    averageWin: calculateAverageWin(trades),
    averageLoss: calculateAverageLoss(trades),
    averageMAE: calculateAverageMAE(trades),
    averageMFE: calculateAverageMFE(trades),
    netProfit: calculateNetProfit(trades),
  };
}

function valuesMatch(expected: number, actual: number): boolean {
  if (Number.isNaN(expected) || Number.isNaN(actual)) {
    return false;
  }

  if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
    return expected === actual;
  }

  return Math.abs(expected - actual) < 0.00000001;
}

function statusFor(expected: number, actual: number): MetricStatus {
  return valuesMatch(expected, actual) ? 'PASS' : 'FAIL';
}

describe('analytics validation suite', () => {
  it('matches manual expected outputs for every dataset and metric', () => {
    const discrepancies: string[] = [];

    for (const dataset of analyticsValidationDatasets) {
      const actual = calculateActualMetrics(dataset.trades);

      for (const metric of METRICS) {
        const expected = dataset.expected[metric];
        const actualValue = actual[metric];
        const status = statusFor(expected, actualValue);

        if (status === 'FAIL') {
          discrepancies.push(
            `${dataset.name}.${metric}: expected=${String(expected)} actual=${String(actualValue)}`,
          );
        }
      }
    }

    expect(discrepancies).toEqual([]);
  });

  it('contains exactly the requested deterministic datasets', () => {
    expect(analyticsValidationDatasets.map((dataset) => dataset.name)).toEqual([
      'all-winning-trades',
      'all-losing-trades',
      'mixed-trades',
      'no-trades',
      'null-mae-mfe-trades',
      'null-atr-trades',
    ]);
  });
});
