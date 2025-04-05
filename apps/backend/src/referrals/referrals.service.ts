import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateReferralDto } from "./dto/create-referral.dto";
import {
  buildPaginatedResponse,
  getPaginationParams,
  type PaginationQuery,
} from "../common/pagination";

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  async create(referrerId: string, dto: CreateReferralDto) {
    const refereeId = dto.refereeId || (await this.findUserIdByEmail(dto.refereeEmail));

    if (!refereeId) {
      throw new BadRequestException("Referee email is required");
    }

    if (refereeId === referrerId) {
      throw new BadRequestException("You cannot refer yourself");
    }

    const existingReferral = await this.prisma.referral.findUnique({
      where: { referrerId_refereeId: { referrerId, refereeId } },
    });
    if (existingReferral) {
      throw new ConflictException("Referral already exists");
    }

    return this.prisma.referral.create({
      data: {
        referrerId,
        refereeId,
      },
      include: {
        referee: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async mine(userId: string, query: PaginationQuery = {}) {
    const pagination = getPaginationParams(query);
    const where = { referrerId: userId };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.referral.findMany({
        where,
        include: {
          referee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.referral.count({ where }),
    ]);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  private async findUserIdByEmail(email?: string) {
    if (!email) {
      return undefined;
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("No user found with that email");
    }

    return user.id;
  }
}

