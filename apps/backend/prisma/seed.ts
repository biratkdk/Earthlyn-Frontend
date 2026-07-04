import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // ── Accounts ────────────────────────────────────────────────────────────────

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@earthlyn.com" },
    update: {},
    create: {
      email: "admin@earthlyn.com",
      name: "Earthlyn Admin",
      passwordHash: await hash("Admin@12345"),
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });

  const sellerUser = await prisma.user.upsert({
    where: { email: "seller@earthlyn.com" },
    update: {},
    create: {
      email: "seller@earthlyn.com",
      name: "Green Roots Co.",
      passwordHash: await hash("Seller@12345"),
      role: "SELLER",
      emailVerifiedAt: new Date(),
    },
  });

  const seller2User = await prisma.user.upsert({
    where: { email: "terra@earthlyn.com" },
    update: {},
    create: {
      email: "terra@earthlyn.com",
      name: "Terra Goods",
      passwordHash: await hash("Seller@12345"),
      role: "SELLER",
      emailVerifiedAt: new Date(),
    },
  });

  const buyerUser = await prisma.user.upsert({
    where: { email: "buyer@earthlyn.com" },
    update: {},
    create: {
      email: "buyer@earthlyn.com",
      name: "Alex Morgan",
      passwordHash: await hash("Buyer@12345"),
      role: "BUYER",
      emailVerifiedAt: new Date(),
    },
  });

  // ── Seller profiles ─────────────────────────────────────────────────────────

  const seller = await prisma.seller.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: {
      userId: sellerUser.id,
      tier: "GROWTH",
      isVerified: true,
      kycStatus: "APPROVED",
      totalSales: 4820.5,
      rating: 4.7,
    },
  });

  const seller2 = await prisma.seller.upsert({
    where: { userId: seller2User.id },
    update: {},
    create: {
      userId: seller2User.id,
      tier: "SPROUT",
      isVerified: true,
      kycStatus: "APPROVED",
      totalSales: 1230.0,
      rating: 4.4,
    },
  });

  await prisma.buyer.upsert({
    where: { userId: buyerUser.id },
    update: {},
    create: {
      userId: buyerUser.id,
      rewardPoints: 320,
      totalSpent: 185.4,
    },
  });

  // ── Products ─────────────────────────────────────────────────────────────────

  const products = [
    {
      sellerId: seller.id,
      name: "Bamboo Starter Kit",
      description:
        "Everything you need to switch to bamboo: toothbrush, comb, cotton buds, and a reusable travel pouch. 100% biodegradable, plastic-free packaging.",
      category: "Personal Care",
      price: 24.99,
      processingFee: 1.25,
      stock: 48,
      ecoScore: 94,
      imageUrl: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80",
    },
    {
      sellerId: seller.id,
      name: "Organic Beeswax Wraps — Set of 4",
      description:
        "Replace single-use cling film with these reusable beeswax wraps. Made with organic cotton, beeswax, jojoba oil, and tree resin. Washable and compostable.",
      category: "Kitchen",
      price: 18.5,
      processingFee: 0.93,
      stock: 72,
      ecoScore: 91,
      imageUrl: "https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=600&q=80",
    },
    {
      sellerId: seller.id,
      name: "Cold-Press Neem Oil Soap",
      description:
        "Handcrafted in small batches using cold-press neem oil, turmeric, and coconut base. Vegan, palm-oil free, wrapped in seed paper you can plant.",
      category: "Personal Care",
      price: 9.99,
      processingFee: 0.5,
      stock: 120,
      ecoScore: 88,
      imageUrl: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=600&q=80",
    },
    {
      sellerId: seller.id,
      name: "Compostable Phone Case — iPhone 15",
      description:
        "Made from certified compostable bioplastic and flax shive. Protects your phone and breaks down completely in a home compost bin within 12 months.",
      category: "Tech Accessories",
      price: 34.0,
      processingFee: 1.7,
      stock: 35,
      ecoScore: 85,
      imageUrl: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&q=80",
    },
    {
      sellerId: seller2.id,
      name: "Reusable Produce Mesh Bags — Pack of 6",
      description:
        "Lightweight organic cotton mesh bags in three sizes. Perfect for fruit, veg, and bulk groceries. Machine washable and built to last years.",
      category: "Kitchen",
      price: 14.95,
      processingFee: 0.75,
      stock: 200,
      ecoScore: 96,
      imageUrl: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=600&q=80",
    },
    {
      sellerId: seller2.id,
      name: "Solar-Powered Lantern",
      description:
        "Foldable solar lantern with a built-in 2000mAh battery. Charges via USB or full sunlight in 5 hours. Ideal for camping, emergencies, or outdoor dining.",
      category: "Outdoor & Garden",
      price: 42.0,
      processingFee: 2.1,
      stock: 28,
      ecoScore: 89,
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    },
    {
      sellerId: seller2.id,
      name: "Wildflower Seed Bombs — Box of 20",
      description:
        "Hand-rolled seed bombs packed with wildflower mix: lavender, cornflower, poppy, and clover. Throw in any patch of bare soil and watch pollinators arrive.",
      category: "Outdoor & Garden",
      price: 12.0,
      processingFee: 0.6,
      stock: 150,
      ecoScore: 99,
      imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80",
    },
    {
      sellerId: seller.id,
      name: "Stainless Steel Water Bottle — 750ml",
      description:
        "Double-wall vacuum insulated. Keeps drinks cold 24 hrs, hot 12 hrs. BPA-free, leak-proof, and made with 90% recycled stainless steel.",
      category: "Drinkware",
      price: 28.0,
      processingFee: 1.4,
      stock: 90,
      ecoScore: 87,
      imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80",
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { name: p.name, sellerId: p.sellerId },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          ...p,
          price: p.price,
          processingFee: p.processingFee,
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
          deliveryStatus: "PENDING",
          stockStatus: "IN_STOCK",
        },
      });
      console.log(`  + ${p.name}`);
    } else {
      console.log(`  ~ ${p.name} (exists)`);
    }
  }

  console.log("\nSeed complete.");
  console.log("  admin@earthlyn.com   / Admin@12345");
  console.log("  seller@earthlyn.com  / Seller@12345");
  console.log("  terra@earthlyn.com   / Seller@12345");
  console.log("  buyer@earthlyn.com   / Buyer@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
