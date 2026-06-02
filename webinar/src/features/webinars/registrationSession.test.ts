import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSubmittedEmailForWebinar,
  getRegistrationPaymentRequiredStorageKey,
  getRegistrationPaymentStatusStorageKey,
  getRegistrationStatusStorageKey,
  getRegistrationSubmittedStorageKey,
  getSubmittedEmailForWebinar,
  getSubmittedPaymentMetaForWebinar,
  getSubmittedStatusForWebinar,
  hasSubmittedWebinarRegistration,
  setSubmittedEmailForWebinar,
  setSubmittedPaymentMetaForWebinar,
  setSubmittedStatusForWebinar,
} from "./registrationSession";

const slug = "sample-webinar";

describe("registrationSession", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores and restores registration progress by webinar slug", () => {
    setSubmittedEmailForWebinar(slug, "teacher@example.com");
    setSubmittedStatusForWebinar(slug, "verified");
    setSubmittedPaymentMetaForWebinar(slug, true, "proof_submitted");

    expect(getSubmittedEmailForWebinar(slug)).toBe("teacher@example.com");
    expect(getSubmittedStatusForWebinar(slug)).toBe("verified");
    expect(getSubmittedPaymentMetaForWebinar(slug)).toEqual({
      paymentRequired: true,
      paymentStatus: "proof_submitted",
    });
    expect(hasSubmittedWebinarRegistration(slug)).toBe(true);
  });

  it("clears all stored registration progress for one webinar", () => {
    sessionStorage.setItem(getRegistrationSubmittedStorageKey(slug), "teacher@example.com");
    sessionStorage.setItem(getRegistrationStatusStorageKey(slug), "pending");
    sessionStorage.setItem(getRegistrationPaymentRequiredStorageKey(slug), "true");
    sessionStorage.setItem(getRegistrationPaymentStatusStorageKey(slug), "unpaid");

    clearSubmittedEmailForWebinar(slug);

    expect(getSubmittedEmailForWebinar(slug)).toBeNull();
    expect(getSubmittedStatusForWebinar(slug)).toBeNull();
    expect(getSubmittedPaymentMetaForWebinar(slug)).toEqual({
      paymentRequired: null,
      paymentStatus: null,
    });
  });
});
