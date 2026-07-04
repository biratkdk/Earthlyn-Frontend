import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            seller: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return items.map((w) => ({ ...w.product, wishlisted: true, wishlistId: w.id }));
  }

  async toggle(userId: string, productId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.wishlist.delete({ where: { id: existing.id } });
      return { wishlisted: false, productId };
    }

    await this.prisma.wishlist.create({ data: { userId, productId } });
    return { wishlisted: true, productId };
  }

  async isWishlisted(userId: string, productId: string) {
    const item = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return { wishlisted: !!item, productId };
  }

  async getWishlistedIds(userId: string): Promise<Set<string>> {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });
    return new Set(items.map((w) => w.productId));
  }
}
