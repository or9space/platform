import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.upsert({
    where: { slug: "freedomguards" },
    update: { name: "Freedom Guards", plan: "FREE", status: "LIVE" },
    create: { slug: "freedomguards", name: "Freedom Guards", plan: "FREE", status: "LIVE" },
  });
  await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: { name: "Demo Org", plan: "FREE", status: "LIVE" },
    create: { slug: "demo", name: "Demo Org", plan: "FREE", status: "LIVE" },
  });
  console.log("seeded tenants: freedomguards, demo");
}

main().finally(() => prisma.$disconnect());
