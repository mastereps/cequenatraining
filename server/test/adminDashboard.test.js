import test from "node:test";
import assert from "node:assert/strict";
import { fillDailySeries, percentChange } from "../services/adminDashboardService.js";

test("percentChange compares periods and skips impossible baselines", () => {
  assert.equal(percentChange(120, 100), 20);
  assert.equal(percentChange(75, 100), -25);
  assert.equal(percentChange(1, 3), -66.7);
  assert.equal(percentChange(5, 0), null);
  assert.equal(percentChange(0, 0), null);
});

test("fillDailySeries returns a dense window ending on the given day", () => {
  const series = fillDailySeries(
    [
      { day: "2026-07-19", total: 4 },
      { day: "2026-07-21", total: 2 },
    ],
    "2026-07-21",
    7,
  );

  assert.equal(series.length, 7);
  assert.equal(series[0].day, "2026-07-15");
  assert.equal(series[6].day, "2026-07-21");
  assert.deepEqual(
    series.map((point) => point.total),
    [0, 0, 0, 0, 4, 0, 2],
  );
});

test("fillDailySeries ignores rows outside the window", () => {
  const series = fillDailySeries([{ day: "2026-06-01", total: 9 }], "2026-07-21", 7);
  assert.equal(
    series.every((point) => point.total === 0),
    true,
  );
});
