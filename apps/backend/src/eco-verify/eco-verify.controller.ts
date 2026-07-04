import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Controller("eco-verify")
export class EcoVerifyController {
  constructor(private prisma: PrismaService) {}

  @Get(":hash")
  async verify(@Param("hash") hash: string) {
    const impact = await this.prisma.ecoImpact.findUnique({
      where: { verificationHash: hash },
      include: {
        user: { select: { name: true } },
        product: { select: { name: true, category: true, ecoScore: true, imageUrl: true } },
        order: { select: { totalAmount: true, createdAt: true } },
      },
    });

    if (!impact) throw new NotFoundException("Verification hash not found");

    let impactData: Record<string, unknown> = {};
    try {
      impactData = typeof impact.impact === "string"
        ? (JSON.parse(impact.impact) as Record<string, unknown>)
        : (impact.impact as Record<string, unknown>);
    } catch { /* malformed */ }

    return {
      verified: true,
      hash: impact.verificationHash,
      issuedAt: impact.createdAt,
      buyer: impact.user.name,
      product: impact.product.name,
      category: impact.product.category,
      ecoScore: impact.product.ecoScore,
      co2SavedKg: impactData.co2SavedKg ?? 0,
      plasticBottlesAvoided: impactData.plasticBottlesAvoided ?? 0,
      ecoPointsEarned: impact.pointsEarned,
      orderTotal: Number(impact.order.totalAmount),
      orderDate: impact.order.createdAt,
    };
  }
}
