import test from "node:test";
import assert from "node:assert/strict";
import { filterValidLineItems, toLineItems } from "../utils/cart.js";

test("toLineItems maps cart records to provider line items", () => {
  assert.deepEqual(
    toLineItems([
      { title: "Book", price_cents: 12550, currency: "PHP", quantity: 2 },
      { price_cents: 300, quantity: 1 },
    ]),
    [
      { name: "Book", amount: 12550, currency: "PHP", quantity: 2 },
      { name: "Item", amount: 300, currency: "PHP", quantity: 1 },
    ],
  );
});

test("filterValidLineItems drops invalid prices and quantities", () => {
  assert.deepEqual(
    filterValidLineItems([
      { name: "Valid", amount: 100, quantity: 1 },
      { name: "No price", amount: 0, quantity: 1 },
      { name: "No quantity", amount: 100, quantity: 0 },
    ]),
    [{ name: "Valid", amount: 100, quantity: 1 }],
  );
});
