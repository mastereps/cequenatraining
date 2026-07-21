import test from "node:test";
import assert from "node:assert/strict";
import {
  assertChronological,
  parseWebinarInput,
} from "../services/webinarAdminService.js";
import { normalizeWhenFilter } from "../services/webinarService.js";

const validCreate = {
  title: "Beyond Words: A Four-Pronged Approach",
  description: "A practical webinar.",
  start_at: "2027-05-16T00:00:00Z",
  end_at: "2027-05-16T04:00:00Z",
};

test("parseWebinarInput derives a slug and applies create defaults", () => {
  const fields = parseWebinarInput(validCreate);

  assert.equal(fields.slug, "beyond-words-a-four-pronged-approach");
  assert.equal(fields.topic, "General");
  assert.equal(fields.timezone, "Asia/Manila");
  // A new webinar is a draft that already accepts sign-ups once published.
  assert.equal(fields.is_published, false);
  assert.equal(fields.registration_open, true);
  // Both columns are nullable: unlimited seats, free to attend.
  assert.equal(fields.capacity, null);
  assert.equal(fields.price_cents, null);
});

test("parseWebinarInput requires the fields the public page renders", () => {
  assert.throws(() => parseWebinarInput({ ...validCreate, title: "  " }), /title is required/);
  assert.throws(
    () => parseWebinarInput({ ...validCreate, description: "" }),
    /description is required/,
  );
  assert.throws(
    () => parseWebinarInput({ ...validCreate, start_at: "not a date" }),
    /valid start date/,
  );
  assert.throws(() => parseWebinarInput({ ...validCreate, end_at: null }), /valid end date/);
});

test("parseWebinarInput rejects a schedule that ends before it starts", () => {
  assert.throws(
    () => parseWebinarInput({ ...validCreate, end_at: validCreate.start_at }),
    /end time must be after/,
  );
  assert.throws(
    () => parseWebinarInput({ ...validCreate, end_at: "2027-05-15T00:00:00Z" }),
    /end time must be after/,
  );
});

test("parseWebinarInput rejects negative capacity and price", () => {
  assert.throws(() => parseWebinarInput({ ...validCreate, capacity: -1 }), /Capacity/);
  assert.throws(() => parseWebinarInput({ ...validCreate, capacity: 1.5 }), /Capacity/);
  assert.throws(() => parseWebinarInput({ ...validCreate, price_cents: -100 }), /Price/);
  assert.equal(parseWebinarInput({ ...validCreate, capacity: 0 }).capacity, 0);
});

test("parseWebinarInput only accepts http(s) or site-relative image links", () => {
  // These render as <img src> and as anchors, so a javascript: value is stored XSS.
  assert.throws(
    () => parseWebinarInput({ ...validCreate, poster_image_url: "javascript:alert(1)" }),
    /poster image/,
  );
  assert.throws(
    () => parseWebinarInput({ ...validCreate, zoom_join_url: "data:text/html,x" }),
    /Zoom link/,
  );

  const fields = parseWebinarInput({
    ...validCreate,
    poster_image_url: "/images/poster.jpg",
    payment_qr_image_url: "https://example.com/qr.png",
    zoom_join_url: "",
  });
  assert.equal(fields.poster_image_url, "/images/poster.jpg");
  assert.equal(fields.payment_qr_image_url, "https://example.com/qr.png");
  assert.equal(fields.zoom_join_url, null);
});

test("parseWebinarInput validates the join link delivery mode", () => {
  assert.equal(
    parseWebinarInput({ ...validCreate, join_link_delivery_mode: "MANUAL" })
      .join_link_delivery_mode,
    "manual",
  );
  assert.throws(
    () => parseWebinarInput({ ...validCreate, join_link_delivery_mode: "carrier-pigeon" }),
    /auto or manual/,
  );
});

test("a partial parse touches only the keys it was sent", () => {
  const fields = parseWebinarInput({ topic: "Digital Learning" }, { partial: true });

  assert.deepEqual(Object.keys(fields), ["topic"]);
  assert.equal(fields.title, undefined);
  assert.equal(fields.registration_open, undefined);
});

test("a partial parse still reads explicit false booleans", () => {
  const fields = parseWebinarInput(
    { is_published: false, registration_open: false },
    { partial: true },
  );

  assert.equal(fields.is_published, false);
  assert.equal(fields.registration_open, false);
});

test("assertChronological compares a one-sided move against the stored row", () => {
  const stored = { start_at: "2027-05-16T00:00:00Z", end_at: "2027-05-16T04:00:00Z" };

  // Moving only the end earlier than the stored start must fail.
  assert.throws(
    () => assertChronological({ end_at: "2027-05-15T00:00:00Z" }, stored),
    /end time must be after/,
  );
  // Moving only the start past the stored end must fail too.
  assert.throws(
    () => assertChronological({ start_at: "2027-05-16T05:00:00Z" }, stored),
    /end time must be after/,
  );
  // Moving both together is fine.
  assert.doesNotThrow(() =>
    assertChronological({ start_at: "2027-06-01T00:00:00Z", end_at: "2027-06-01T02:00:00Z" }, stored),
  );
});

test("normalizeWhenFilter defaults to upcoming for anything unrecognised", () => {
  assert.equal(normalizeWhenFilter(undefined), "upcoming");
  assert.equal(normalizeWhenFilter(""), "upcoming");
  assert.equal(normalizeWhenFilter("bogus"), "upcoming");
  assert.equal(normalizeWhenFilter("PAST"), "past");
  assert.equal(normalizeWhenFilter(" all "), "all");
});
