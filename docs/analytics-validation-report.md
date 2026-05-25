# Analytics Validation Report

Project: Mira Remora Trading Intelligence

Scope:

- Analytics engine formula validation using deterministic datasets
- Manual expected outputs compared to actual function outputs

Validation command:

- `yarn vitest run src/modules/trade/analytics.validation.test.ts`

## Datasets

1. all-winning-trades
2. all-losing-trades
3. mixed-trades
4. no-trades
5. null-mae-mfe-trades
6. null-atr-trades

## Formula Checks

Metrics validated:

- Win Rate
- Profit Factor
- Expectancy
- Average Win
- Average Loss
- Average MAE
- Average MFE
- Net Profit

## Results Matrix

### all-winning-trades

| Metric        |    Expected |      Actual | Status |
| ------------- | ----------: | ----------: | ------ |
| Win Rate      |         100 |         100 | PASS   |
| Profit Factor |    Infinity |    Infinity | PASS   |
| Expectancy    | 83.33333333 | 83.33333333 | PASS   |
| Average Win   | 83.33333333 | 83.33333333 | PASS   |
| Average Loss  |           0 |           0 | PASS   |
| Average MAE   |  6.66666667 |  6.66666667 | PASS   |
| Average MFE   | 24.33333333 | 24.33333333 | PASS   |
| Net Profit    |         250 |         250 | PASS   |

### all-losing-trades

| Metric        |     Expected |       Actual | Status |
| ------------- | -----------: | -----------: | ------ |
| Win Rate      |            0 |            0 | PASS   |
| Profit Factor |            0 |            0 | PASS   |
| Expectancy    | -33.33333333 | -33.33333333 | PASS   |
| Average Win   |            0 |            0 | PASS   |
| Average Loss  | -33.33333333 | -33.33333333 | PASS   |
| Average MAE   |  15.66666667 |  15.66666667 | PASS   |
| Average MFE   |   6.33333333 |   6.33333333 | PASS   |
| Net Profit    |         -100 |         -100 | PASS   |

### mixed-trades

| Metric        | Expected | Actual | Status |
| ------------- | -------: | -----: | ------ |
| Win Rate      |       50 |     50 | PASS   |
| Profit Factor |        4 |      4 | PASS   |
| Expectancy    |       30 |     30 | PASS   |
| Average Win   |       80 |     80 | PASS   |
| Average Loss  |      -40 |    -40 | PASS   |
| Average MAE   |    11.25 |  11.25 | PASS   |
| Average MFE   |     22.5 |   22.5 | PASS   |
| Net Profit    |      120 |    120 | PASS   |

### no-trades

| Metric        | Expected | Actual | Status |
| ------------- | -------: | -----: | ------ |
| Win Rate      |        0 |      0 | PASS   |
| Profit Factor |        0 |      0 | PASS   |
| Expectancy    |        0 |      0 | PASS   |
| Average Win   |        0 |      0 | PASS   |
| Average Loss  |        0 |      0 | PASS   |
| Average MAE   |        0 |      0 | PASS   |
| Average MFE   |        0 |      0 | PASS   |
| Net Profit    |        0 |      0 | PASS   |

### null-mae-mfe-trades

| Metric        |    Expected |      Actual | Status |
| ------------- | ----------: | ----------: | ------ |
| Win Rate      | 33.33333333 | 33.33333333 | PASS   |
| Profit Factor |         2.5 |         2.5 | PASS   |
| Expectancy    |          10 |          10 | PASS   |
| Average Win   |          50 |          50 | PASS   |
| Average Loss  |         -20 |         -20 | PASS   |
| Average MAE   |  3.33333333 |  3.33333333 | PASS   |
| Average MFE   |           5 |           5 | PASS   |
| Net Profit    |          30 |          30 | PASS   |

### null-atr-trades

| Metric        | Expected | Actual | Status |
| ------------- | -------: | -----: | ------ |
| Win Rate      |       50 |     50 | PASS   |
| Profit Factor |        3 |      3 | PASS   |
| Expectancy    |       10 |     10 | PASS   |
| Average Win   |       30 |     30 | PASS   |
| Average Loss  |      -10 |    -10 | PASS   |
| Average MAE   |        5 |      5 | PASS   |
| Average MFE   |      8.5 |    8.5 | PASS   |
| Net Profit    |       20 |     20 | PASS   |

## Discrepancies

- None found.

## QA Findings

- All requested deterministic datasets were implemented.
- Manual formula expectations match analytics engine outputs for all validated metrics.
- Null MAE/MFE behavior is confirmed: null values are treated as 0 in current calculations.
- Null ATR behavior is confirmed: ATR does not currently affect validated metrics.
