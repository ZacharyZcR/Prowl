import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  totalPages: number;
  siblingCount?: number;
  onPageChange?: (page: number) => void;
}

function range(start: number, end: number) {
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

function getPages(page: number, totalPages: number, siblings: number): (number | "...")[] {
  const totalSlots = siblings * 2 + 5;
  if (totalPages <= totalSlots) return range(1, totalPages);

  const leftSib = Math.max(page - siblings, 1);
  const rightSib = Math.min(page + siblings, totalPages);
  const showLeftDots = leftSib > 3;
  const showRightDots = rightSib < totalPages - 2;

  if (!showLeftDots && showRightDots) {
    const left = range(1, 3 + 2 * siblings);
    return [...left, "...", totalPages];
  }
  if (showLeftDots && !showRightDots) {
    const right = range(totalPages - (2 + 2 * siblings), totalPages);
    return [1, "...", ...right];
  }
  return [1, "...", ...range(leftSib, rightSib), "...", totalPages];
}

const btnBase =
  "inline-flex h-8 min-w-[32px] items-center justify-center rounded-md px-2 text-sm transition-colors";

export function Pagination({ page, totalPages, siblingCount = 1, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = getPages(page, totalPages, siblingCount);

  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
        className={cn(btnBase, "text-[var(--stc-text-secondary)] hover:bg-[var(--stc-surface-subtle)] disabled:opacity-40")}
      >
        &lsaquo;
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-1 text-[var(--stc-text-tertiary)]">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange?.(p)}
            className={cn(
              btnBase,
              p === page
                ? "bg-[var(--stc-brand-600)] text-white font-medium"
                : "text-[var(--stc-text-secondary)] hover:bg-[var(--stc-surface-subtle)]",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange?.(page + 1)}
        className={cn(btnBase, "text-[var(--stc-text-secondary)] hover:bg-[var(--stc-surface-subtle)] disabled:opacity-40")}
      >
        &rsaquo;
      </button>
    </nav>
  );
}
