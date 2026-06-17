import { Suspense } from "react";
import { ArrowRightLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { UexNotice, safeUex } from "@/components/sc-tools/ui";
import { ShipCompareClient } from "@/components/sc-tools/ship-compare-client";
import { getVehicles } from "@/lib/uex/queries";

export const metadata = {
  title: "Ship Comparator",
  description: "Compare Star Citizen ship stats side by side.",
};

export default async function ShipComparePage() {
  const result = await safeUex(getVehicles);

  if (!result.ok) {
    return (
      <div className="p-3 sm:p-6">
        <PageHeader
          icon={ArrowRightLeft}
          title="Compare"
          subtitle="Ship stat comparison"
        />
        <UexNotice>Couldn&apos;t reach UEX right now. Try again shortly.</UexNotice>
      </div>
    );
  }

  // Filter to spaceships only, sort by company then name
  const spaceships = result.data
    .filter((v) => v.is_spaceship === 1)
    .sort((a, b) => {
      const co = (a.company_name ?? "").localeCompare(b.company_name ?? "");
      return co !== 0 ? co : a.name.localeCompare(b.name);
    });

  return (
    <div className="p-3 sm:p-6 animate-page-enter">
      <PageHeader
        icon={ArrowRightLeft}
        title="Compare"
        subtitle="Ship stat comparison"
      />
      <Suspense>
        <ShipCompareClient ships={spaceships} />
      </Suspense>
    </div>
  );
}
