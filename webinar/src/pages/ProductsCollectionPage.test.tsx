import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProductsCollectionPage from "./ProductsCollectionPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProductsCollectionPage />
    </MemoryRouter>,
  );

describe("ProductsCollectionPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a loading state while books are being fetched", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText("Loading books...")).toBeInTheDocument();
  });

  it("renders an empty state when the catalog has no books", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderPage();

    expect(await screen.findByText("No books found for this filter yet.")).toBeInTheDocument();
  });

  it("renders an error state when the catalog request fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    renderPage();

    expect(await screen.findByText("Couldn't load books right now.")).toBeInTheDocument();
  });
});
