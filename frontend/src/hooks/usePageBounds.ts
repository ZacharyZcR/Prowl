import { useEffect } from "react";

export function usePageBounds(page: number, totalPages: number, setPage: (page: number) => void) {
  useEffect(() => {
    const maxPage = Math.max(1, totalPages);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, setPage, totalPages]);
}
