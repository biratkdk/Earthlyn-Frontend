import test from "node:test";
import assert from "node:assert/strict";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../src/auth/auth.service";

const jwtSecret = "test_jwt_secret_value_with_32_chars_min";

function createConfig(overrides: Record<string, unknown> = {}) {
  return {
    get<T = string>(key: string, defaultValue?: T): T {
      const values: Record<string, unknown> = {
        "bcrypt.rounds": 10,
        "jwt.secret": jwtSecret,
        FRONTEND_URL: "https://earthlyn.test",
        ALLOW_ADMIN_REGISTRATION: "false",
        REQUIRE_EMAIL_VERIFICATION: "false",
        ...overrides,
      };

      return (values[key] ?? defaultValue) as T;
    },
  };
}

function createEmailService() {
  return {
    verificationLinks: [] as string[],
    resetLinks: [] as string[],
    async sendEmailVerification(_to: string, verificationLink: string) {
      this.verificationLinks.push(verificationLink);
    },
    async sendPasswordReset(_to: string, resetLink: string) {
      this.resetLinks.push(resetLink);
    },
  };
}

function createPrisma() {
  const state = {
    users: [] as Array<{
      id: string;
      email: string;
      name: string;
      passwordHash: string;
      role: "BUYER" | "SELLER" | "ADMIN" | "CUSTOMER_SERVICE";
      isActive: boolean;
      emailVerifiedAt: Date | null;
    }>,
    buyers: [] as Array<{ userId: string }>,
    sellers: [] as Array<{ userId: string }>,
    emailVerificationTokens: [] as Array<{
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      consumedAt: Date | null;
    }>,
  };

  const prisma = {
    state,
    user: {
      async findUnique({ where, select }: any) {
        const user = state.users.find(
          (candidate) =>
            candidate.id === where.id || candidate.email === where.email,
        );
        if (!user || !select) return user ?? null;
        return Object.fromEntries(
          Object.entries(select)
            .filter(([, enabled]) => enabled)
            .map(([key]) => [key, user[key as keyof typeof user]]),
        );
      },
      async create({ data }: any) {
        const user = {
          id: `user-${state.users.length + 1}`,
          isActive: true,
          emailVerifiedAt: null,
          ...data,
        };
        state.users.push(user);
        return user;
      },
      async update({ where, data }: any) {
        const user = state.users.find((candidate) => candidate.id === where.id);
        if (!user) return null;
        Object.assign(user, data);
        return user;
      },
    },
    buyer: {
      async create({ data }: any) {
        state.buyers.push(data);
        return data;
      },
    },
    seller: {
      async create({ data }: any) {
        state.sellers.push(data);
        return data;
      },
    },
    emailVerificationToken: {
      async create({ data }: any) {
        const record = {
          id: `evt-${state.emailVerificationTokens.length + 1}`,
          consumedAt: null,
          ...data,
        };
        state.emailVerificationTokens.push(record);
        return record;
      },
      async findUnique({ where }: any) {
        return (
          state.emailVerificationTokens.find(
            (token) => token.tokenHash === where.tokenHash,
          ) ?? null
        );
      },
      async update({ where, data }: any) {
        const token = state.emailVerificationTokens.find(
          (candidate) => candidate.id === where.id,
        );
        if (!token) return null;
        Object.assign(token, data);
        return token;
      },
      async updateMany({ where, data }: any) {
        let count = 0;
        for (const token of state.emailVerificationTokens) {
          if (token.userId === where.userId && token.consumedAt === null) {
            Object.assign(token, data);
            count += 1;
          }
        }
        return { count };
      },
    },
    async $transaction(fn: any) {
      return fn(this);
    },
  };

  return prisma;
}

function createAuthService(configOverrides: Record<string, unknown> = {}) {
  const prisma = createPrisma();
  const emailService = createEmailService();
  const service = new AuthService(
    prisma as any,
    new JwtService({ secret: jwtSecret }),
    createConfig(configOverrides) as any,
    emailService as any,
  );

  return { service, prisma, emailService };
}

test("register creates a schema-backed email verification token and sends a verification link", async () => {
  const { service, prisma, emailService } = createAuthService();

  const auth = await service.register({
    email: "buyer@example.com",
    name: "Buyer",
    password: "Password1",
    role: "BUYER" as any,
  });

  assert.ok(auth.accessToken);
  assert.equal(auth.requiresEmailVerification, false);
  assert.equal(prisma.state.emailVerificationTokens.length, 1);
  assert.equal(prisma.state.emailVerificationTokens[0].userId, "user-1");
  assert.match(emailService.verificationLinks[0], /\/verify-email\?token=/);
  assert.equal(prisma.state.users[0].emailVerifiedAt, null);
});

test("register does not issue a session when email verification is required", async () => {
  const { service, emailService } = createAuthService({
    REQUIRE_EMAIL_VERIFICATION: "true",
  });

  const auth = await service.register({
    email: "buyer@example.com",
    name: "Buyer",
    password: "Password1",
    role: "BUYER" as any,
  });

  assert.equal(auth.accessToken, undefined);
  assert.equal(auth.requiresEmailVerification, true);
  assert.match(emailService.verificationLinks[0], /\/verify-email\?token=/);
});

test("verifyEmail consumes the stored token and marks the user verified", async () => {
  const { service, prisma, emailService } = createAuthService();
  await service.register({
    email: "buyer@example.com",
    name: "Buyer",
    password: "Password1",
    role: "BUYER" as any,
  });

  const rawToken = new URL(emailService.verificationLinks[0]).searchParams.get(
    "token",
  );
  assert.ok(rawToken);

  await (service as any).verifyEmail(rawToken);

  assert.ok(prisma.state.users[0].emailVerifiedAt instanceof Date);
  assert.ok(prisma.state.emailVerificationTokens[0].consumedAt instanceof Date);
  await assert.rejects(
    () => (service as any).verifyEmail(rawToken),
    BadRequestException,
  );
});

test("login rejects unverified users when email verification is required", async () => {
  const { service, prisma } = createAuthService({
    REQUIRE_EMAIL_VERIFICATION: "true",
  });
  const passwordHash = await bcrypt.hash("Password1", 10);
  prisma.state.users.push({
    id: "user-1",
    email: "buyer@example.com",
    name: "Buyer",
    passwordHash,
    role: "BUYER",
    isActive: true,
    emailVerifiedAt: null,
  });

  await assert.rejects(
    () => service.login({ email: "buyer@example.com", password: "Password1" }),
    UnauthorizedException,
  );
});

test("password reset sends a reset email and invalidates the token after password change", async () => {
  const { service, prisma, emailService } = createAuthService();
  const passwordHash = await bcrypt.hash("OldPassword1", 10);
  prisma.state.users.push({
    id: "user-1",
    email: "buyer@example.com",
    name: "Buyer",
    passwordHash,
    role: "BUYER",
    isActive: true,
    emailVerifiedAt: new Date(),
  });

  await service.requestPasswordReset("buyer@example.com");
  assert.equal(emailService.resetLinks.length, 1);

  const rawToken = new URL(emailService.resetLinks[0]).searchParams.get("token");
  assert.ok(rawToken);

  await service.resetPassword(rawToken, "NewPassword1");
  assert.equal(
    await bcrypt.compare("NewPassword1", prisma.state.users[0].passwordHash),
    true,
  );

  await assert.rejects(
    () => service.resetPassword(rawToken, "AnotherPassword1"),
    BadRequestException,
  );
});
