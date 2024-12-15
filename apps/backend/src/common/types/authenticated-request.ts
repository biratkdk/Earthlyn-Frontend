import type { Request } from "express";
import type { UserRole } from "../decorators/roles.decorator";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  emailVerifiedAt?: Date | null;
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

export type StripeWebhookRequest = Request & {
  rawBody?: Buffer;
};
