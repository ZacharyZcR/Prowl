import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PageShell } from "./PageShell";

function wrap(ui: React.ReactElement) {
  return render(ui, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
}

describe("PageShell", () => {
  it("renders title and children", () => {
    wrap(
      <PageShell title="Test Page">
        <p>content</p>
      </PageShell>,
    );
    expect(screen.getByText("Test Page")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders actions slot", () => {
    wrap(
      <PageShell title="T" actions={<button>Action</button>}>
        <div />
      </PageShell>,
    );
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  it("renders description and meta", () => {
    wrap(
      <PageShell
        title="With Meta"
        description="Helpful description"
        meta={<span>Meta block</span>}
      >
        <div />
      </PageShell>,
    );
    expect(screen.getByText("Helpful description")).toBeInTheDocument();
    expect(screen.getByText("Meta block")).toBeInTheDocument();
  });

  it("renders without actions", () => {
    wrap(
      <PageShell title="No Actions">
        <span>body</span>
      </PageShell>,
    );
    expect(screen.getByText("No Actions")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});
