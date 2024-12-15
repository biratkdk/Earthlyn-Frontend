import test from "node:test";
import assert from "node:assert/strict";
import { PrivacyService } from "../src/privacy/privacy.service";

function createPrivacyPrisma() {
  const state = {
    user: {
      id: "user-1",
      email: "buyer@example.com",
      name: "Buyer",
      role: "BUYER",
      balance: "0.00",
      ecoPoints: 10,
      isActive: true,
      emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    },
    settings: null as any,
    exports: [] as any[],
    messagesUpdated: null as any,
    ticketsUpdated: null as any,
  };

  const createSettings = (data: any = {}) => ({
    id: "privacy-1",
    userId: "user-1",
    dataCollection: true,
    marketing: true,
    analytics: true,
    consentGivenAt: new Date("2026-01-01T00:00:00.000Z"),
    lastUpdatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletionRequested: null,
    deletionAt: null,
    ...data,
  });

  const prisma = {
    state,
    privacySettings: {
      async upsert(payload: any) {
        state.settings = {
          ...(state.settings || createSettings(payload.create)),
          ...(payload.update || {}),
        };
        return state.settings;
      },
      async findUnique() {
        return state.settings;
      },
      async findMany() {
        return [];
      },
    },
    dataExportLog: {
      async create(payload: any) {
        const exportLog = {
          id: "export-1",
          userId: payload.data.userId,
          format: payload.data.format,
          exportedAt: new Date("2026-01-01T00:00:00.000Z"),
          expiresAt: payload.data.expiresAt,
          downloadUrl: payload.data.downloadUrl,
          downloadedAt: null,
        };
        state.exports.push(exportLog);
        return exportLog;
      },
      async update(payload: any) {
        const exportLog = state.exports.find(
          (item) => item.id === payload.where.id,
        );
        Object.assign(exportLog, payload.data);
        return exportLog;
      },
      async findFirst(payload: any) {
        return state.exports.find(
          (item) =>
            item.id === payload.where.id &&
            item.userId === payload.where.userId,
        );
      },
      async findMany() {
        return state.exports;
      },
      async count() {
        return state.exports.length;
      },
    },
    user: {
      async findUnique() {
        return state.user;
      },
      async update(payload: any) {
        state.user = { ...state.user, ...payload.data };
        return state.user;
      },
    },
    buyer: {
      async findUnique() {
        return null;
      },
    },
    seller: {
      async findUnique() {
        return null;
      },
    },
    order: {
      async findMany() {
        return [];
      },
    },
    transaction: {
      async findMany() {
        return [];
      },
    },
    message: {
      async findMany() {
        return [];
      },
      async updateMany(payload: any) {
        state.messagesUpdated = payload.data;
        return { count: 1 };
      },
    },
    ecoImpact: {
      async findMany() {
        return [];
      },
    },
    productReview: {
      async findMany() {
        return [];
      },
    },
    referral: {
      async findMany() {
        return [];
      },
    },
    subscription: {
      async findMany() {
        return [];
      },
    },
    dispute: {
      async findMany() {
        return [];
      },
    },
    ticket: {
      async findMany() {
        return [];
      },
      async updateMany(payload: any) {
        state.ticketsUpdated = payload.data;
        return { count: 1 };
      },
    },
    ticketResponse: {
      async updateMany() {
        return { count: 1 };
      },
    },
    notification: {
      async findMany() {
        return [];
      },
    },
    async $transaction(callback: (transaction: any) => unknown) {
      return callback(prisma);
    },
  };

  return prisma;
}

test("requestDataExport creates expiring JSON export with download endpoint", async () => {
  const prisma = createPrivacyPrisma();
  const service = new PrivacyService(prisma as any);

  const exportLog = await service.requestDataExport("user-1");

  assert.equal(exportLog.format, "JSON");
  assert.equal(exportLog.downloadUrl, "/privacy/exports/export-1/download");
  assert.ok(exportLog.expiresAt instanceof Date);
});

test("downloadDataExport returns user payload and marks export downloaded", async () => {
  const prisma = createPrivacyPrisma();
  const service = new PrivacyService(prisma as any);
  await service.requestDataExport("user-1");

  const payload = await service.downloadDataExport("user-1", "export-1");

  assert.equal(payload.exportId, "export-1");
  assert.equal(payload.user.email, "buyer@example.com");
  assert.equal(prisma.state.exports[0].downloadedAt instanceof Date, true);
});

test("requestAccountDeletion schedules deletion with grace period", async () => {
  const prisma = createPrivacyPrisma();
  const service = new PrivacyService(prisma as any);

  const settings = await service.requestAccountDeletion("user-1");

  assert.equal(settings.gracePeriodDays, 7);
  assert.ok(settings.deletionRequested instanceof Date);
  assert.ok(settings.deletionScheduledAt instanceof Date);
});

test("cancelDeletionRequest clears pending deletion", async () => {
  const prisma = createPrivacyPrisma();
  const service = new PrivacyService(prisma as any);
  await service.requestAccountDeletion("user-1");

  const settings = await service.cancelDeletionRequest("user-1");

  assert.equal(settings.deletionRequested, null);
  assert.equal(settings.deletionScheduledAt, null);
});

test("deleteUserData anonymizes account without cascading transaction records", async () => {
  const prisma = createPrivacyPrisma();
  const service = new PrivacyService(prisma as any);

  const user = await service.deleteUserData("user-1");

  assert.equal(user.email, "deleted-user-1@deleted.earthlyn.local");
  assert.equal(user.isActive, false);
  assert.equal(prisma.state.messagesUpdated.content, "[deleted by user]");
  assert.equal(prisma.state.ticketsUpdated.description, "[deleted by user]");
});
