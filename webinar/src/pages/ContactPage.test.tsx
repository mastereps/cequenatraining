import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactPage from "./ContactPage";

describe("ContactPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the contact form", () => {
    render(<ContactPage />);

    expect(screen.getByRole("heading", { name: "Contact Us" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your email:")).toBeInTheDocument();
    expect(screen.getByLabelText("Your message:")).toBeInTheDocument();
  });

  it("rejects invalid email addresses before calling the API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<ContactPage />);

    await user.type(screen.getByLabelText("Your email:"), "not-an-email");
    await user.type(screen.getByLabelText("Your message:"), "Please send details.");
    fireEvent.submit(screen.getByRole("button", { name: "Send" }).closest("form")!);

    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits trimmed contact details and renders the success state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<ContactPage />);

    await user.type(screen.getByLabelText("Your email:"), " teacher@example.com ");
    await user.type(screen.getByLabelText("Your message:"), " Please send details. ");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "teacher@example.com",
          message: "Please send details.",
        }),
      });
    });
    expect(
      screen.getByText("Message sent successfully to mbcequena@gmail.com."),
    ).toBeInTheDocument();
  });
});
