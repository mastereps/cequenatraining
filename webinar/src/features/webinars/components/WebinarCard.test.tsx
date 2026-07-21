import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  setSubmittedEmailForWebinar,
  setSubmittedPaymentMetaForWebinar,
  setSubmittedStatusForWebinar,
} from "../registrationSession";
import type { Webinar } from "../types";
import WebinarCard from "./WebinarCard";

const webinar: Webinar = {
  id: "webinar-1",
  slug: "sample-webinar",
  title: "Reading Strategies",
  topic: "Language & Literacy",
  description: "A practical teaching session.",
  start_at: "2026-06-02T00:00:00.000Z",
  end_at: "2026-06-02T01:00:00.000Z",
  timezone: "Asia/Manila",
  capacity: 25,
  price_cents: 50000,
  currency: "PHP",
  verified_count: 0,
  available_seats: 25,
  is_full: false,
  is_published: true,
  registration_open: true,
  poster_image_url: null,
  payment_qr_image_url: null,
  payment_instructions: null,
  join_link_delivery_mode: "manual",
  archived_at: null,
};

const renderCard = (past = false) =>
  render(
    <MemoryRouter>
      <WebinarCard webinar={webinar} past={past} />
    </MemoryRouter>,
  );

describe("WebinarCard", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("links unregistered visitors to the webinar detail page", () => {
    renderCard();

    expect(screen.getByRole("link", { name: "Reserve my spot" })).toHaveAttribute(
      "href",
      "/webinars/sample-webinar",
    );
  });

  it("offers no way to register once the webinar is past", () => {
    // Even with a live session lock, the archive variant must not surface a
    // registration call to action for an event that already happened.
    setSubmittedEmailForWebinar(webinar.slug, "teacher@example.com");
    setSubmittedStatusForWebinar(webinar.slug, "verified");

    renderCard(true);

    expect(screen.queryByRole("link", { name: "Reserve my spot" })).toBeNull();
    expect(screen.queryByText("Already registered")).toBeNull();
    expect(screen.getByRole("link", { name: "View details" })).toHaveAttribute(
      "href",
      "/webinars/sample-webinar",
    );
    expect(screen.getByText(/attendee/)).toBeInTheDocument();
  });

  it("shows the payment review state for verified submissions", () => {
    setSubmittedEmailForWebinar(webinar.slug, "teacher@example.com");
    setSubmittedStatusForWebinar(webinar.slug, "verified");
    setSubmittedPaymentMetaForWebinar(webinar.slug, true, "proof_submitted");

    renderCard();

    expect(screen.getByRole("link", { name: "Payment under review" })).toHaveAttribute(
      "href",
      "/webinars/sample-webinar/confirmed?email=teacher%40example.com",
    );
  });
});
