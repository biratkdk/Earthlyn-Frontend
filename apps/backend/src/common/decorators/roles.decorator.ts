import { SetMetadata } from "@nestjs/common";

export enum UserRole {
  ADMIN = "ADMIN",
  SELLER = "SELLER",
  BUYER = "BUYER",
  CUSTOMER_SERVICE = "CUSTOMER_SERVICE",
}

export const Roles = (...roles: UserRole[]) => SetMetadata("roles", roles);
