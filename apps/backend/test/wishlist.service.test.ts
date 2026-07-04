import test from "node:test";
import assert from "node:assert/strict";
import { WishlistService } from "../src/wishlist/wishlist.service";

function makePrisma() {
  const items: any[] = [];
  let nextId = 1;
  return {
    _items: items,
    wishlist: {
      async findMany({ where }: any) {
        return items
          .filter((i) => i.userId === where.userId)
          .map((i) => ({ ...i, product: { id: i.productId, name: "Test" } }));
      },
      async findUnique({ where }: any) {
        return items.find(
          (i) => i.userId === where.userId_productId.userId && i.productId === where.userId_productId.productId,
        ) ?? null;
      },
      async create({ data }: any) {
        const item = { id: String(nextId++), ...data };
        items.push(item);
        return item;
      },
      async delete({ where }: any) {
        const idx = items.findIndex((i) => i.id === where.id);
        if (idx !== -1) items.splice(idx, 1);
        return {};
      },
    },
  };
}

test("toggle adds item when not wishlisted", async () => {
  const prisma = makePrisma();
  const svc = new WishlistService(prisma as any);
  const result = await svc.toggle("u1", "p1");
  assert.equal(result.wishlisted, true);
  assert.equal(prisma._items.length, 1);
});

test("toggle removes item when already wishlisted", async () => {
  const prisma = makePrisma();
  const svc = new WishlistService(prisma as any);
  await svc.toggle("u1", "p1");
  const result = await svc.toggle("u1", "p1");
  assert.equal(result.wishlisted, false);
  assert.equal(prisma._items.length, 0);
});

test("isWishlisted returns true for existing item", async () => {
  const prisma = makePrisma();
  const svc = new WishlistService(prisma as any);
  await svc.toggle("u1", "p1");
  const result = await svc.isWishlisted("u1", "p1");
  assert.equal(result.wishlisted, true);
});

test("isWishlisted returns false for missing item", async () => {
  const prisma = makePrisma();
  const svc = new WishlistService(prisma as any);
  const result = await svc.isWishlisted("u1", "p99");
  assert.equal(result.wishlisted, false);
});

test("getWishlistedIds returns a Set of product IDs", async () => {
  const prisma = makePrisma();
  prisma._items.push({ id: "1", userId: "u1", productId: "p1" }, { id: "2", userId: "u1", productId: "p2" });
  // override findMany for getWishlistedIds (uses select: { productId })
  const origFindMany = prisma.wishlist.findMany.bind(prisma.wishlist);
  (prisma.wishlist as any).findMany = async ({ where, select }: any) => {
    if (select?.productId) return prisma._items.filter((i) => i.userId === where.userId).map((i) => ({ productId: i.productId }));
    return origFindMany({ where, select });
  };
  const svc = new WishlistService(prisma as any);
  const ids = await svc.getWishlistedIds("u1");
  assert.ok(ids instanceof Set);
  assert.ok(ids.has("p1"));
  assert.ok(ids.has("p2"));
  assert.equal(ids.size, 2);
});
