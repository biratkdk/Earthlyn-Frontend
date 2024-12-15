export interface PaginationQuery {
  page?: string | number;
  pageSize?: string | number;
  limit?: string | number;
  take?: string | number;
  skip?: string | number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function toPositiveInt(value: string | number | undefined, fallback: number) {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(value || "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function getPaginationParams(
  query: PaginationQuery = {},
): PaginationParams {
  const requestedPageSize = query.pageSize ?? query.limit ?? query.take;
  const pageSize = Math.min(
    toPositiveInt(requestedPageSize, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );

  if (query.skip !== undefined) {
    const skip = Math.max(toPositiveInt(query.skip, 0), 0);
    return {
      page: Math.floor(skip / pageSize) + 1,
      pageSize,
      skip,
      take: pageSize,
    };
  }

  const page = toPositiveInt(query.page, 1);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function buildPaginatedResponse<T>(
  items: T[],
  totalItems: number,
  pagination: PaginationParams,
): PaginatedResponse<T> {
  const totalPages = Math.max(Math.ceil(totalItems / pagination.pageSize), 1);

  return {
    items,
    meta: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  };
}
