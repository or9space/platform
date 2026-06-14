/**
 * Forbids untenanted Prisma access outside sanctioned files:
 *  1. Importing @prisma/client anywhere except lib/db.ts, lib/rls.ts,
 *     scripts/**, tests/**, prisma/**.
 *  2. prismaGlobal.<model>.<op> where <model> is not in the GLOBAL_TABLES
 *     whitelist (mirrored here; lib/db.ts is the source of truth).
 */
const GLOBAL_TABLES = [
  "account",
  "accountOauth",
  "tenant",
  "pendingTenant",
  "tenantConfigOverride",
  "tenantFeatureFlag",
  "supportTicket",
  "supportMessage",
  "adSlot",
  "adCreative",
  "loginSetupToken",
];

const PRISMA_VERBS = new Set([
  "findMany", "findFirst", "findUnique", "findUniqueOrThrow", "findFirstOrThrow",
  "count", "aggregate", "groupBy",
  "create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany",
]);

const SANCTIONED_IMPORT = /(?:^|[\\/])(lib[\\/](?:db|rls)\.ts|scripts[\\/]|tests[\\/]|prisma[\\/]|vitest\.setup\.ts)/;

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Tenant-scoped Prisma access must go through db(ctx)" },
    messages: {
      noDirectImport:
        "Import @prisma/client only in lib/db.ts, lib/rls.ts, scripts/, tests/, prisma/. App code must use db(ctx) from @/lib/db.",
      noTenantedGlobal:
        "prismaGlobal.{{model}} is tenant-scoped. Use db(ctx).{{model}} so tenant_id is enforced.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const sanctioned = SANCTIONED_IMPORT.test(filename);

    return {
      ImportDeclaration(node) {
        if (sanctioned) return;
        if (node.source.value === "@prisma/client") {
          context.report({ node, messageId: "noDirectImport" });
        }
      },
      MemberExpression(node) {
        // matches prismaGlobal.<model>.<verb>
        if (
          node.object?.type === "MemberExpression" &&
          node.object.object?.type === "Identifier" &&
          node.object.object.name === "prismaGlobal" &&
          node.object.property?.type === "Identifier" &&
          node.property?.type === "Identifier" &&
          PRISMA_VERBS.has(node.property.name)
        ) {
          const model = node.object.property.name;
          if (!GLOBAL_TABLES.includes(model)) {
            context.report({ node, messageId: "noTenantedGlobal", data: { model } });
          }
        }
      },
    };
  },
};
