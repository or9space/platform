import { notFound } from "next/navigation";
import { Rocket } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listOrgFleet, fleetStats } from "@/lib/queries/fleet";
import { MfdPanel } from "@/components/ui/mfd";
import { FleetStats } from "@/components/fleet/fleet-stats";
import { FleetViewer } from "@/components/fleet/fleet-viewer";
import { AddShipForm } from "./add-ship-form";
import { ShipActions } from "./ship-actions";

export default async function FleetPage() {
  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);
  if (!viewer) notFound();

  const ctx = makeTenantContext(tenant.id);

  const [ships, stats] = await Promise.all([
    listOrgFleet(ctx, viewer.id),
    fleetStats(ctx),
  ]);

  const canCommand = hasTier(viewer.tier, "COMMAND");
  const myShips = ships.filter((s) => s.ownerMembershipId === viewer.id);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Rocket className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Fleet</h1>
          <p className="text-sm text-text-muted">Org ship registry</p>
        </div>
      </div>

      {/* Count line + My Hangar shortcut */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {stats.totalQuantity} ship{stats.totalQuantity !== 1 ? "s" : ""} across{" "}
          {stats.totalShips} record{stats.totalShips !== 1 ? "s" : ""}
        </p>
        <a
          href="#my-hangar"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-fg-cream hover:bg-primary/90 transition-colors"
        >
          My Hangar
        </a>
      </div>

      {/* KPI strip */}
      <MfdPanel
        chassis="primary"
        title={<span>[ FLEET STATUS ]</span>}
        bodyPadding="sm"
      >
        <div className="flex flex-wrap gap-6 py-1">
          <div className="flex flex-col gap-0.5">
            <span className="mfd-label">SHIPS</span>
            <span className="mfd-readout text-primary">{stats.totalShips}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="mfd-label">TOTAL QTY</span>
            <span className="mfd-readout text-amber">{stats.totalQuantity}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="mfd-label">MY SHIPS</span>
            <span className="mfd-readout text-text-primary">{myShips.length}</span>
          </div>
        </div>
      </MfdPanel>

      {/* Fleet composition stats */}
      {ships.length > 0 && (
        <FleetStats ships={ships} />
      )}

      {/* Org fleet — search / sort / grid / list */}
      {ships.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Rocket className="mb-4 h-12 w-12 opacity-20" />
          <p className="text-lg font-medium">No ships registered yet</p>
          <p className="mt-1 text-sm">Members can add ships via their hangar.</p>
        </div>
      ) : (
        <FleetViewer
          ships={ships}
          viewerMembershipId={viewer.id}
          canCommand={canCommand}
        />
      )}

      {/* My Hangar */}
      <div id="my-hangar">
        <MfdPanel
          chassis="amber"
          title={<span>[ MY HANGAR ]</span>}
          titleAside={<span className="mfd-label">{myShips.length} SHIPS</span>}
          bodyPadding="md"
        >
          {myShips.length === 0 ? (
            <p className="mb-4 text-sm text-text-muted">
              No ships registered. Add one below.
            </p>
          ) : (
            <div className="mb-6 space-y-3">
              {myShips.map((ship) => (
                <div
                  key={ship.id}
                  className="border border-border-light bg-surface-elevated p-4"
                >
                  <div className="flex items-start gap-4">
                    {ship.imageUrl && ship.imageUrl.startsWith("http") && (
                      <img
                        src={ship.imageUrl}
                        alt={ship.shipName}
                        className="h-16 w-24 shrink-0 object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-text-primary">
                          {ship.shipName}
                        </span>
                        {ship.manufacturer && (
                          <span className="text-sm text-text-secondary">
                            {ship.manufacturer}
                          </span>
                        )}
                        {!ship.isPublic && (
                          <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-text-muted">
                            PRIVATE
                          </span>
                        )}
                        <span className="mfd-label">
                          QTY:{" "}
                          <span className="font-mono text-amber">
                            {ship.quantity}
                          </span>
                        </span>
                      </div>
                      {ship.notes && (
                        <p className="mt-1 text-sm text-text-secondary whitespace-pre-wrap">
                          {ship.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <ShipActions ship={ship} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <AddShipForm />
        </MfdPanel>
      </div>
    </div>
  );
}
