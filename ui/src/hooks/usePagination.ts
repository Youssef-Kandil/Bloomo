'use client';

import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_PAGE_SIZE = 10;

export interface PaginationState<T> {
  page: number;
  setPage: (p: number) => void;
  pageCount: number;
  pageSize: number;
  paginated: T[];
  totalCount: number;
  /** 1-based index of the first item on the current page (0 if empty). */
  firstIndex: number;
  /** 1-based index of the last item on the current page (0 if empty). */
  lastIndex: number;
}

/**
 * Client-side pagination over a fully loaded list. Resets to page 1 whenever
 * the input shrinks below the current page (e.g., after a filter narrows it).
 *
 *   const { paginated, page, setPage, pageCount, totalCount, firstIndex, lastIndex }
 *     = usePagination(filteredRows);
 *   <table>...{paginated.map(...)}</table>
 *   <Pagination ... />
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = DEFAULT_PAGE_SIZE,
): PaginationState<T> {
  const [page, setPage] = useState(1);
  const totalCount = items.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [pageCount, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const firstIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastIndex = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);

  return { page, setPage, pageCount, pageSize, paginated, totalCount, firstIndex, lastIndex };
}
