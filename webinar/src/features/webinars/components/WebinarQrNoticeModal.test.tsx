import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WebinarQrNoticeModal from "./WebinarQrNoticeModal";

const renderModal = (onClose = vi.fn()) => {
  render(
    <WebinarQrNoticeModal
      open
      onClose={onClose}
      heading="Registration Required Before Payment"
      notice="Complete registration first."
      supportingText="Submit the form before paying."
      primaryActionLabel="Continue"
      onPrimaryAction={vi.fn()}
    />,
  );

  return onClose;
};

describe("WebinarQrNoticeModal", () => {
  it("renders the registration reminder", () => {
    renderModal();

    expect(
      screen.getByRole("dialog", { name: "Registration Required Before Payment" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Complete registration first.")).toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    const onClose = renderModal();

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
