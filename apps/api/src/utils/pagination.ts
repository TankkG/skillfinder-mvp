export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

export const parsePagination = (
  query: Record<string, unknown>,
  defaultPageSize = 20,
  maxPageSize = 100,
): PaginationParams => {
  const rawPage = Number(query.page ?? 1);
  const rawSize = Number(query.pageSize ?? defaultPageSize);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize > 0
      ? Math.min(Math.floor(rawSize), maxPageSize)
      : defaultPageSize;
  return { page, pageSize, skip: (page - 1) * pageSize };
};

export const paginated = <T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) => ({
  items,
  page,
  pageSize,
  total,
  totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
});
