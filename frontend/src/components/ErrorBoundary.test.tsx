import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import i18n from "@/i18n";
import { ErrorBoundary } from "./ErrorBoundary";

function ThrowError(): never {
  throw new Error("test error");
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>ok</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("renders fallback on error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );
    expect(screen.getByText(i18n.t("common.somethingWentWrong"))).toBeInTheDocument();
    expect(screen.getByText("test error")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("renders custom fallback on error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <ThrowError />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
    spy.mockRestore();
  });
});
