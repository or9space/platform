import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const freedomguards = await prisma.tenant.upsert({
    where: { slug: "freedomguards" },
    update: { name: "Freedom Guards", plan: "FREE", status: "LIVE" },
    create: { slug: "freedomguards", name: "Freedom Guards", plan: "FREE", status: "LIVE" },
  });
  const demo = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: { name: "Demo Org", plan: "FREE", status: "LIVE" },
    create: { slug: "demo", name: "Demo Org", plan: "FREE", status: "LIVE" },
  });
  console.log("seeded tenants: freedomguards, demo");

  const starterCategories = [
    { name: "General", slug: "general", sortOrder: 0 },
    { name: "Announcements", slug: "announcements", sortOrder: 1 },
  ];

  for (const tenant of [freedomguards, demo]) {
    for (const cat of starterCategories) {
      await prisma.forumCategory.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug: cat.slug } },
        update: { name: cat.name, sortOrder: cat.sortOrder },
        create: {
          tenantId: tenant.id,
          name: cat.name,
          slug: cat.slug,
          sortOrder: cat.sortOrder,
        },
      });
    }
  }
  console.log("seeded forum categories: general, announcements (freedomguards + demo)");
}

main().finally(() => prisma.$disconnect());
