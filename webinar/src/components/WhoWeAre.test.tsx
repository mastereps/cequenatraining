import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WhoWeAre from "./WhoWeAre";

const milestone = (title: string, no?: string) => ({ title, detail: `${title} detail`, no });

describe("WhoWeAre milestones", () => {
  it("numbers milestones by position when the admin leaves the number blank", () => {
    render(
      <WhoWeAre
        content={{ milestones: [milestone("First"), milestone("Second"), milestone("Third")] }}
      />,
    );

    // Desktop timeline and mobile list both render, so each label appears twice.
    expect(screen.getAllByText("01")).not.toHaveLength(0);
    expect(screen.getAllByText("02")).not.toHaveLength(0);
    expect(screen.getAllByText("03")).not.toHaveLength(0);
  });

  it("keeps an explicit number when one is supplied", () => {
    render(<WhoWeAre content={{ milestones: [milestone("Only", "1998")] }} />);

    expect(screen.getAllByText("1998")).not.toHaveLength(0);
    expect(screen.queryByText("01")).toBeNull();
  });

  it("splits any count across two rows and renders every milestone", () => {
    const titles = ["A", "B", "C", "D", "E"];
    const { container } = render(
      <WhoWeAre content={{ milestones: titles.map((t) => milestone(t)) }} />,
    );

    const desktop = container.querySelector<HTMLElement>(".lg\\:block");
    expect(desktop).not.toBeNull();
    titles.forEach((title) => {
      expect(within(desktop as HTMLElement).getByText(title)).toBeInTheDocument();
    });

    // Grid tracks follow the row length: 5 milestones split 3 / 2.
    const grids = within(desktop as HTMLElement)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.closest("div.grid") as HTMLElement);
    expect(grids[0].style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(grids[grids.length - 1].style.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("renders the second half right-to-left", () => {
    const { container } = render(
      <WhoWeAre
        content={{ milestones: ["A", "B", "C", "D"].map((t) => milestone(t)) }}
      />,
    );

    const desktop = container.querySelector<HTMLElement>(".lg\\:block") as HTMLElement;
    const order = within(desktop)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(order).toEqual(["A", "B", "D", "C"]);
  });
});
