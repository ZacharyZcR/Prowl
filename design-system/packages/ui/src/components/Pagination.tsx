import type { ButtonHTMLAttributes } from "react";

type PaginationItem =
  | { type: "page"; value: number }
  | { type: "ellipsis"; key: string };

export interface PaginationProps {
  page: number;
  totalPages: number;
  siblingCount?: number;
  onPageChange?: (page: number) => void;
}

function createRange(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function createPaginationItems(
  page: number,
  totalPages: number,
  siblingCount: number
): PaginationItem[] {
  const visibleSlots = siblingCount * 2 + 5;

  if (totalPages <= visibleSlots) {
    return createRange(1, totalPages).map((value) => ({ type: "page", value }));
  }

  const leftBoundary = Math.max(page - siblingCount, 2);
  const rightBoundary = Math.min(page + siblingCount, totalPages - 1);
  const showLeftEllipsis = leftBoundary > 2;
  const showRightEllipsis = rightBoundary < totalPages - 1;
  const items: PaginationItem[] = [{ type: "page", value: 1 }];

  if (showLeftEllipsis) {
    items.push({ type: "ellipsis", key: "left" });
  } else {
    createRange(2, leftBoundary - 1).forEach((value) => items.push({ type: "page", value }));
  }

  createRange(leftBoundary, rightBoundary).forEach((value) => items.push({ type: "page", value }));

  if (showRightEllipsis) {
    items.push({ type: "ellipsis", key: "right" });
  } else {
    createRange(rightBoundary + 1, totalPages - 1).forEach((value) =>
      items.push({ type: "page", value })
    );
  }

  items.push({ type: "page", value: totalPages });

  return items;
}

interface PaginationButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

function PaginationButton({ active = false, className, ...props }: PaginationButtonProps) {
  return (
    <button
      className={["yza-pagination__button", active ? "is-active" : "", className]
        .filter(Boolean)
        .join(" ")}
      type="button"
      {...props}
    />
  );
}

export function Pagination({
  onPageChange,
  page,
  siblingCount = 1,
  totalPages
}: PaginationProps) {
  const items = createPaginationItems(page, totalPages, siblingCount);
  const isPrevDisabled = page <= 1;
  const isNextDisabled = page >= totalPages;

  return (
    <nav aria-label="分页导航" className="yza-pagination">
      <PaginationButton
        aria-label="上一页"
        disabled={isPrevDisabled}
        onClick={() => {
          if (!isPrevDisabled) {
            onPageChange?.(page - 1);
          }
        }}
      >
        上一页
      </PaginationButton>

      <div className="yza-pagination__pages">
        {items.map((item) =>
          item.type === "ellipsis" ? (
            <span
              aria-hidden="true"
              className="yza-pagination__ellipsis"
              key={item.key}
            >
              …
            </span>
          ) : (
            <PaginationButton
              active={item.value === page}
              aria-current={item.value === page ? "page" : undefined}
              aria-label={`第 ${item.value} 页`}
              key={item.value}
              onClick={() => onPageChange?.(item.value)}
            >
              {item.value}
            </PaginationButton>
          )
        )}
      </div>

      <PaginationButton
        aria-label="下一页"
        disabled={isNextDisabled}
        onClick={() => {
          if (!isNextDisabled) {
            onPageChange?.(page + 1);
          }
        }}
      >
        下一页
      </PaginationButton>
    </nav>
  );
}
