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

    // ── 12 new products ────────────────────────────────────────────────────────
    {
      sellerId: seller2.id,
      name: "Zero-Waste Shampoo Bar — Rosemary & Mint",
      description:
        "One bar replaces 2–3 bottles of liquid shampoo. Sulphate-free, vegan, and packaged in a compostable kraft sleeve. Works on all hair types including colour-treated.",
      category: "Personal Care",
      price: 12.5,
      processingFee: 0.63,
      stock: 180,
      ecoScore: 97,
      imageUrl: "https://images.unsplash.com/photo-1631390093966-d8bd6f7e8ad1?w=600&q=80",
    },
    {
      sellerId: seller.id,
      name: "Bamboo Cutting Board — Large",
      description:
        "Extra-thick bamboo cutting board with juice grooves and non-slip feet. Bamboo is naturally antimicrobial and regenerates 3× faster than hardwood. Hand-wash only.",
      category: "Kitchen",
      price: 32.0,
      processingFee: 1.6,
      stock: 55,
      ecoScore: 90,
      imageUrl: "https://images.unsplash.com/photo-1564844536311-de546a28c87d?w=600&q=80",
    },
    {
      sellerId: seller2.id,
      name: "Recycled Glass Tumbler Set — 4 Pack",
      description:
        "Hand-blown from 100% post-consumer recycled glass. Each tumbler is slightly unique — slight variations in colour and shape are part of the charm. Dishwasher safe.",
      category: "Drinkware",
      price: 38.0,
      processingFee: 1.9,
      stock: 40,
      ecoScore: 88,
      imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80",
    },
    {
      sellerId: seller.id,
      name: "Solar Garden Stake Lights — Set of 8",
      description:
        "Powder-coated stainless steel stakes with monocrystalline solar panels. Auto on/off at dusk, 8-hour runtime. No wiring, no batteries to replace — ever.",
      category: "Outdoor & Garden",
      price: 36.0,
      processingFee: 1.8,
      stock: 62,
      ecoScore: 93,
      imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80",
    },
    {
      sellerId: seller2.id,
      name: "Organic Cotton Tote Bag — Heavy Duty",
      description:
        "Made from GOTS-certified 12oz organic cotton canvas. Reinforced stitching at handles, internal zip pocket. Replaces over 700 single-use plastic bags over its lifetime.",
      category: "Personal Care",
      price: 16.0,
      processingFee: 0.8,
      stock: 220,
      ecoScore: 95,
      imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80",
    },
    {
      sellerId: seller.id,
      name: "Bamboo Laptop Stand",
      description:
        "Adjustable 6-angle bamboo laptop stand. Improves posture and ventilation. Sustainably harvested Moso bamboo — no glues, no plastics, assembled with stainless steel hardware.",
      category: "Tech Accessories",
      price: 45.0,
      processingFee: 2.25,
      stock: 30,
      ecoScore: 82,
      imageUrl: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80",
    },
    {
      sellerId: seller2.id,
      name: "Cork Yoga Mat",
      description:
        "Natural cork surface on a TPE rubber base — zero PVC, zero latex, zero toxic off-gassing. Self-cleaning (antimicrobial), non-slip even when wet. 4mm thick, 183cm × 61cm.",
      category: "Personal Care",
      price: 68.0,
      processingFee: 3.4,
      stock: 25,
      ecoScore: 91,
      imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80",
    },
    {
      sellerId: seller.id,
      name: "Compostable Bin Liners — 60 Bags",
      description:
        "EN 13432 certified home-compostable bin liners. Thick enough for kitchen waste, breaks down in 12 weeks in a home compost. Sold in a recycled cardboard box.",
      category: "Kitchen",
      price: 11.0,
      processingFee: 0.55,
      stock: 300,
      ecoScore: 98,
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    },
    {
      sellerId: seller2.id,
      name: "Insulated Bamboo Travel Mug — 350ml",
      description:
        "Double-walled bamboo exterior with stainless steel interior. Keeps coffee hot 4 hrs, iced drinks cold 8 hrs. Leakproof lid, fits most car cup holders.",
      category: "Drinkware",
      price: 22.0,
      processingFee: 1.1,
      stock: 75,
      ecoScore: 89,
      imageUrl: "https://images.unsplash.com/photo-1572119865084-43c285814d63?w=600&q=80",
    },
    {
      sellerId: seller.id,
      name: "Seed Starter Biodegradable Pots — 48 Pack",
      description:
        "Made from compressed coir and peat-free compost. Plant pot and all directly into soil — roots grow through the walls, no transplant shock. Ideal for tomatoes, herbs, and flowers.",
      category: "Outdoor & Garden",
      price: 14.0,
      processingFee: 0.7,
      stock: 160,
      ecoScore: 99,
      imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80",
    },
    {
      sellerId: seller2.id,
      name: "Natural Loofah Sponge Set — 3 Pack",
      description:
        "100% plant-grown Egyptian loofah. Exfoliates and cleans without microplastic shedding. Fully biodegradable — add to compost when worn out. Lasts 4–6 weeks per sponge.",
      category: "Personal Care",
      price: 8.5,
      processingFee: 0.43,
      stock: 250,
      ecoScore: 100,
      imageUrl: "https://images.unsplash.com/photo-1631390093966-d8bd6f7e8ad1?w=600&q=80",
    },
    {
      sellerId: seller.id,
      name: "Solar USB Charging Panel — 10W",
      description:
        "Foldable monocrystalline 10W solar panel with dual USB-A ports. Charges phones and small devices in direct sunlight. Water-resistant, packable to A4 size. Great for hiking and travel.",
      category: "Tech Accessories",
      price: 54.0,
      processingFee: 2.7,
      stock: 20,
      ecoScore: 86,
      imageUrl: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80",
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
