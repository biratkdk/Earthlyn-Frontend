import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { KYCStatus } from "@prisma/client";
import { SellerKycService } from "../src/seller-kyc/seller-kyc.service";

const requiredDocuments = [
  {
    id: "doc-1",
    docType: "GOVT_ID",
    url: "/uploads/govt-id.pdf",
    status: "PENDING",
  },
  {
    id: "doc-2",
    docType: "BUSINESS_LICENSE",
    url: "/uploads/license.pdf",
    status: "PENDING",
  },
  {
    id: "doc-3",
    docType: "BANK_STATEMENT",
    url: "/uploads/bank.pdf",
    status: "PENDING",
  },
];

function createKycPrisma(documents = requiredDocuments) {
  const state = {
    seller: {
      id: "seller-1",
      userId: "seller-user-1",
      kycStatus: KYCStatus.PENDING,
      isVerified: false,
      kycDocuments: documents.map((document) => ({ ...document })),
    },
    audits: [] as any[],
  };

  const tx = {
    seller: {
      async findUnique() {
        return state.seller;
      },
      async update(payload: any) {
        state.seller = { ...state.seller, ...payload.data };
        return state.seller;
      },
      async findUniqueOrThrow() {
        return state.seller;
      },
    },
    sellerKycDocument: {
      async updateMany(payload: any) {
        state.seller.kycDocuments = state.seller.kycDocuments.map(
          (document) => ({
            ...document,
            ...payload.data,
          }),
        );
        return { count: state.seller.kycDocuments.length };
      },
    },
    adminAudit: {
      async create(payload: any) {
        state.audits.push(payload.data);
        return payload.data;
      },
    },
  };

  return {
    state,
    async $transaction(callback: (transaction: typeof tx) => unknown) {
      return callback(tx);
    },
  };
}

test("approveKyc verifies seller, marks documents, and writes audit log", async () => {
  const prisma = createKycPrisma();
  const service = new SellerKycService(prisma as any);

  const result = await service.approveKyc("admin-1", "seller-1");

  assert.equal(result.kycStatus, KYCStatus.APPROVED);
  assert.equal(result.isVerified, true);
  assert.equal((prisma.state.seller as any).kycReviewedById, "admin-1");
  assert.ok(
    prisma.state.seller.kycDocuments.every((doc) => doc.status === "APPROVED"),
  );
  assert.equal(prisma.state.audits[0].action, "APPROVE_SELLER_KYC");
  assert.equal(prisma.state.audits[0].entityType, "SELLER_KYC");
});

test("rejectKyc requires a rejection reason", async () => {
  const prisma = createKycPrisma();
  const service = new SellerKycService(prisma as any);

  await assert.rejects(
    () => service.rejectKyc("admin-1", "seller-1", " "),
    BadRequestException,
  );
});

test("approveKyc rejects incomplete document sets", async () => {
  const prisma = createKycPrisma(requiredDocuments.slice(0, 2));
  const service = new SellerKycService(prisma as any);

  await assert.rejects(
    () => service.approveKyc("admin-1", "seller-1"),
    BadRequestException,
  );
});
