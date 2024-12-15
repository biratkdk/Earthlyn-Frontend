import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "../src/common/pagination";

test("getPaginationParams clamps page and page size to production-safe values", () => {
  assert.deepEqual(getPaginationParams({ page: "-1", pageSize: "999" }), {
    page: 1,
    pageSize: 100,
    skip: 0,
    take: 100,
  });
});

test("buildPaginatedResponse returns items with stable pagination metadata", () => {
  const response = buildPaginatedResponse(["a", "b"], 22, {
    page: 2,
    pageSize: 10,
    skip: 10,
    take: 10,
  });

  assert.deepEqual(response, {
    items: ["a", "b"],
    meta: {
      page: 2,
      pageSize: 10,
      totalItems: 22,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    },
  });
});
