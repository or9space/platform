const { RuleTester } = require("eslint");
const rule = require("../../eslint-rules/no-untenanted-query.js");

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

tester.run("no-untenanted-query", rule, {
  valid: [
    { code: `import { PrismaClient } from "@prisma/client";`, filename: "lib/db.ts" },
    { code: `import { PrismaClient } from "@prisma/client";`, filename: "scripts/seed.ts" },
    { code: `prismaGlobal.tenant.findUnique({ where: { slug } });`, filename: "lib/server/get-tenant.ts" },
    { code: `prismaGlobal.supportTicket.findMany({});`, filename: "lib/actions/support.ts" },
    { code: `db(ctx).membership.findMany({});`, filename: "lib/actions/anything.ts" },
  ],
  invalid: [
    {
      code: `import { PrismaClient } from "@prisma/client";`,
      filename: "lib/actions/forums.ts",
      errors: [{ messageId: "noDirectImport" }],
    },
    {
      code: `prismaGlobal.membership.findMany({});`,
      filename: "lib/actions/anything.ts",
      errors: [{ messageId: "noTenantedGlobal" }],
    },
    {
      code: `prismaGlobal.auditLog.create({ data: {} });`,
      filename: "app/page.tsx",
      errors: [{ messageId: "noTenantedGlobal" }],
    },
  ],
});

console.log("no-untenanted-query: all RuleTester cases passed");
