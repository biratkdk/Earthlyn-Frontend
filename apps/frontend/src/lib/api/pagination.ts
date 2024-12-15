export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export function getPaginatedItems<T>(
  data: T[] | PaginatedResponse<T> | null | undefined,
): T[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.items)) {
    return data.items;
  }

  return [];
}

export function getPaginationMeta<T>(
  data: T[] | PaginatedResponse<T> | null | undefined,
): PaginationMeta | null {
  return data && !Array.isArray(data) ? data.meta : null;
}
