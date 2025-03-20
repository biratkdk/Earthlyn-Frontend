import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import type { CreateReviewDto } from "./dto/create-review.dto";

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(buyerUserId: string, dto: CreateReviewDto) {
    // Resolve buyer profile
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: buyerUserId },
    });
    if (!buyer) throw new NotFoundException("Buyer profile not found");

    // Validate order exists and belongs to this buyer
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { product: { include: { seller: true } } },
    });
    if (!order) throw new NotFoundException("Order not found");
    if (order.buyerId !== buyerUserId) {
      throw new ForbiddenException("Order does not belong to this buyer");
    }

    // Order must be DELIVERED
    if (order.status !== "DELIVERED") {
      throw new BadRequestException(
        "You can only review products from delivered orders",
      );
    }

    // Order product must match dto productId
    if (order.productId !== dto.productId) {
      throw new BadRequestException(
        "Product does not match the order",
      );
    }

    // No duplicate review for the same order
    const existing = await this.prisma.review.findUnique({
      where: { orderId: dto.orderId },
    });
    if (existing) {
      throw new BadRequestException("You have already reviewed this order");
    }

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        buyerId: buyer.id,
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
    });

    // Recalculate seller rating after creating the review
    const sellerId = order.product.sellerId;
    await this.recalculateSellerRating(sellerId);

    return review;
  }

  private async recalculateSellerRating(sellerId: string) {
    const result = await this.prisma.review.aggregate({
      where: {
        product: { sellerId },
      },
      _avg: { rating: true },
    });

    const newRating = result._avg.rating ?? 0;

    await this.prisma.seller.update({
      where: { id: sellerId },
      data: { rating: newRating },
    });
  }

  async findByProduct(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      include: {
        buyer: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const ratingInfo = await this.getProductRating(productId);

    return { reviews, ...ratingInfo };
  }

  async findByBuyer(buyerUserId: string) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { userId: buyerUserId },
    });
    if (!buyer) throw new NotFoundException("Buyer profile not found");

    return this.prisma.review.findMany({
      where: { buyerId: buyer.id },
      include: {
        product: { select: { id: true, name: true, imageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getProductRating(productId: string) {
    const result = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { id: true },
    });

    return {
      averageRating: result._avg.rating ? Number(result._avg.rating.toFixed(1)) : 0,
      totalReviews: result._count.id,
    };
  }
}

