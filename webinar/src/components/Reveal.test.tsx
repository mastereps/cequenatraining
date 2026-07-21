import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Reveal from "./Reveal";

type Callback = (entries: { isIntersecting: boolean }[]) => void;

const observers: { callback: Callback; disconnect: ReturnType<typeof vi.fn> }[] = [];

const installObserver = () => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      disconnect = vi.fn();
      constructor(public callback: Callback) {
        observers.push(this);
      }
      observe() {}
      unobserve() {}
    },
  );
};

afterEach(() => {
  observers.length = 0;
  vi.unstubAllGlobals();
});

describe("Reveal", () => {
  it("starts hidden and reveals on the first intersection", () => {
    installObserver();
    render(<Reveal>content</Reveal>);
    const wrapper = screen.getByText("content");

    expect(wrapper).not.toHaveClass("reveal-in");

    act(() => observers[0].callback([{ isIntersecting: true }]));
    expect(wrapper).toHaveClass("reveal-in");
  });

  it("stops observing once revealed, so scrolling back never replays it", () => {
    installObserver();
    render(<Reveal>content</Reveal>);
    const observer = observers[0];

    act(() => observer.callback([{ isIntersecting: true }]));
    expect(observer.disconnect).toHaveBeenCalled();

    // Even if a stale entry arrives, the element stays revealed.
    act(() => observer.callback([{ isIntersecting: false }]));
    expect(screen.getByText("content")).toHaveClass("reveal-in");
  });

  it("renders visible when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Reveal>content</Reveal>);
    expect(screen.getByText("content")).toHaveClass("reveal-in");
  });
});
