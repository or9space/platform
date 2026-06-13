import { describe, it, expect } from "vitest";
import { ConfigSchema } from "@/lib/config/schema";
import { rankLabelKey } from "@/components/rank";

describe("rank labels", () => {
  it("config defaults provide the four rank labels", () => {
    const c = ConfigSchema.parse({
      branding: { name: "X" }, labels: {}, features: {
        forums: true, handbook: false, loot: false, inventory: false, treasury: false,
        fleet: false, tournaments: false, "calendar.googleIntegration": false, "discord.bot": false, ads: false,
      },
    });
    expect(c.labels.rankEnlisted).toBe("Enlisted");
    expect(c.labels.rankCommand).toBe("Command");
  });

  it("rankLabelKey maps each tier to its label key", () => {
    expect(rankLabelKey("ENLISTED")).toBe("rankEnlisted");
    expect(rankLabelKey("NCO")).toBe("rankNco");
    expect(rankLabelKey("OFFICER")).toBe("rankOfficer");
    expect(rankLabelKey("COMMAND")).toBe("rankCommand");
  });
});
