import { useState } from "react";

export function usePagination(initialPage = 1, initialPageSize = 20) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const reset = () => setPage(1);

  return { page, pageSize, setPage, setPageSize, reset };
}
