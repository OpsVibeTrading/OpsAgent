export type PaginationResponse<T> = {
  count: number;
  page: number;
  pageSize: number;
  items: T[];
};

export type PaginationRequest = {
  page: number;
  pageSize: number;
};
