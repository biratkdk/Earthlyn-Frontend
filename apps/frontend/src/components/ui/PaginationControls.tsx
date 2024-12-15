"use client";

import { useEffect, useState } from "react";

interface PaginationControlsProps {
  currentPage: number;
  itemLabel?: string;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  itemLabel = "items",
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  const clampedPage = Math.min(Math.max(currentPage, 1), totalPages);
  const [pageInput, setPageInput] = useState(String(clampedPage));

  useEffect(() => {
    setPageInput(String(clampedPage));
  }, [clampedPage]);

  if (totalPages <= 1) return null;

  const firstItem = (clampedPage - 1) * pageSize + 1;
  const lastItem = Math.min(clampedPage * pageSize, totalItems);
  const goToPage = (page: number) => {
    if (!Number.isFinite(page)) return;
    onPageChange(Math.min(Math.max(Math.trunc(page), 1), totalPages));
  };
  const commitPageInput = () => {
    const parsedPage = Number(pageInput);
    if (!Number.isFinite(parsedPage)) {
      setPageInput(String(clampedPage));
      return;
    }

    const nextPage = Math.min(Math.max(Math.trunc(parsedPage), 1), totalPages);
    setPageInput(String(nextPage));
    onPageChange(nextPage);
  };

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
      <span>
        Showing {firstItem}-{lastItem} of {totalItems} {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goToPage(clampedPage - 1)}
          disabled={clampedPage === 1}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="rounded-full border border-black/10 px-3 py-2">
          Page
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onBlur={commitPageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            aria-label="Go to page"
            className="mx-2 w-14 rounded border border-black/10 px-2 py-1 text-center"
          />
          of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => goToPage(clampedPage + 1)}
          disabled={clampedPage === totalPages}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
