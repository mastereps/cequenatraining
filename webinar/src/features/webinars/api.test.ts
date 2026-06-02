import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWebinars, resendConfirmationEmail } from "./api";

describe("webinar API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends webinar filters as query parameters", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [], count: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await fetchWebinars({
      search: "reading",
      availability: "open",
      limit: 3,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/webinars?search=reading&availability=open&limit=3",
      { credentials: "include" },
    );
  });

  it("exposes resend retry timing from error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Please wait before requesting another confirmation.",
          details: { retry_after_seconds: 30 },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "20",
          },
        },
      ),
    );

    await expect(resendConfirmationEmail("sample-webinar", "teacher@example.com")).rejects.toMatchObject({
      message: "Please wait before requesting another confirmation.",
      retryAfterSeconds: 30,
    });
  });
});
