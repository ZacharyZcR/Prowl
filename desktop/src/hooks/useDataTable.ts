import { useEffect, useState } from "react";
import { usePagination } from "./usePagination";
import { useDebounce } from "./useDebounce";

export function useDataTable(initialPageSize = 20) {
  const pagination = usePagination(1, initialPageSize);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    pagination.reset();
  }, [debouncedSearch]);

  return { ...pagination, search, setSearch, debouncedSearch };
}
