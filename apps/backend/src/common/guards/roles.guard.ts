import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  private logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      "roles",
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      this.logger.warn(
        "Role metadata was reached without an authenticated user",
      );
      throw new ForbiddenException("No user found");
    }

    const hasRole = () => requiredRoles.some((role) => user.role === role);

    if (!hasRole()) {
      this.logger.warn(`Role mismatch for user ${user.id}: ${user.role}`);
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
// role-based access
