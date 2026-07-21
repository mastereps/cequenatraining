import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSlug,
  parseBookInput,
  parseExternalLinks,
} from "../services/bookService.js";

test("normalizeSlug produces url-safe lowercase slugs", () => {
  assert.equal(normalizeSlug("  Facets of Life: Kaleidoscope "), "facets-of-life-kaleidoscope");
  assert.equal(normalizeSlug("Tome --- of  Wisdom!"), "tome-of-wisdom");
  assert.equal(normalizeSlug("???"), "");
});

test("parseBookInput derives a slug from the title when none is given", () => {
  const fields = parseBookInput({
    title: "Pathways to Proficient Readers",
    price_cents: 20000,
    cover_image_url: "/images/cover.png",
  });

  assert.equal(fields.slug, "pathways-to-proficient-readers");
  assert.equal(fields.currency, "PHP");
  assert.equal(fields.price_cents, 20000);
});

test("parseBookInput rejects bad prices and missing required fields", () => {
  const base = { title: "A Book", cover_image_url: "/images/cover.png" };

  assert.throws(() => parseBookInput({ ...base, price_cents: -1 }), /Price/);
  assert.throws(() => parseBookInput({ ...base, price_cents: 12.5 }), /Price/);
  assert.throws(() => parseBookInput({ ...base, price_cents: "free" }), /Price/);
  assert.throws(() => parseBookInput({ title: "", price_cents: 100 }), /title/);
  assert.throws(() => parseBookInput({ ...base, price_cents: 100, currency: "PESOS" }), /Currency/);
});

test("parseBookInput in partial mode only returns the keys that were sent", () => {
  const fields = parseBookInput({ in_stock: false }, { partial: true });
  assert.deepEqual(fields, { in_stock: false });
});

test("parseExternalLinks validates urls and keeps the given order", () => {
  const links = parseExternalLinks([
    { label: "Lazada", url: "https://lazada.com.ph/x", region: "local" },
    {
      label: "Ethics Press",
      url: "https://ethicspress.com/x",
      region: "international",
      channel: "publisher-direct",
    },
  ]);

  assert.deepEqual(links, [
    {
      label: "Lazada",
      url: "https://lazada.com.ph/x",
      region: "local",
      channel: "marketplace",
      sort_order: 0,
    },
    {
      label: "Ethics Press",
      url: "https://ethicspress.com/x",
      region: "international",
      channel: "publisher-direct",
      sort_order: 1,
    },
  ]);
});

test("parseExternalLinks refuses non-http urls", () => {
  assert.throws(
    () => parseExternalLinks([{ label: "Bad", url: "javascript:alert(1)" }]),
    /http/,
  );
  assert.throws(() => parseExternalLinks([{ label: "", url: "https://x.test" }]), /label/);
  assert.throws(
    () => parseExternalLinks([{ label: "Odd", url: "https://x.test", region: "moon" }]),
    /region/,
  );
});

test("parseExternalLinks distinguishes absent from empty", () => {
  assert.equal(parseExternalLinks(undefined), undefined);
  assert.deepEqual(parseExternalLinks([]), []);
});
