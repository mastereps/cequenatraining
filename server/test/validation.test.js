import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidEmail,
  normalizeEmail,
  parseDateInput,
  parseOptionalFields,
  sanitizeText,
} from "../utils/validation.js";

test("sanitizeText trims, collapses whitespace, and enforces max length", () => {
  assert.equal(sanitizeText("  hello   world  ", 8), "hello wo");
});

test("email helpers normalize and validate addresses", () => {
  assert.equal(normalizeEmail(" Teacher@Example.COM "), "teacher@example.com");
  assert.equal(isValidEmail(" Teacher@Example.COM "), true);
  assert.equal(isValidEmail("not-an-email"), false);
});

test("parseDateInput returns valid dates and rejects invalid values", () => {
  assert.equal(parseDateInput("2026-06-02T00:00:00Z")?.toISOString(), "2026-06-02T00:00:00.000Z");
  assert.equal(parseDateInput("not-a-date"), null);
  assert.equal(parseDateInput(""), null);
});

test("parseOptionalFields keeps supported values and sanitizes text", () => {
  assert.deepEqual(
    parseOptionalFields({
      " organization ": "  Example   School ",
      role: " Teacher ",
      years: 4,
      attending: true,
      ignored: ["array"],
    }),
    {
      organization: "Example School",
      role: "Teacher",
      years: 4,
      attending: true,
    },
  );
  assert.deepEqual(parseOptionalFields(null), {});
});
