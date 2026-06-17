import { notFound } from "next/navigation";
import { Rocket } from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listOrgFleet, fleetStats } from "@/lib/queries/fleet";
import { MfdPanel } from "@/components/ui/mfd";
import { AddShipForm } from "./add-ship-form";
import { ShipActions } from "./ship-actions";
import { ModerateDeleteButton } from "./moderate-delete-button";

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
  const orgShips = ships;

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

      {/* Org Fleet */}
      <MfdPanel
        chassis="neutral"
        title={<span>[ ORG FLEET ]</span>}
        titleAside={<span className="mfd-label">{orgShips.length} RECORDS</span>}
        bodyPadding="none"
      >
        {orgShips.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-muted">No ships in the org fleet yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="px-4 py-2 font-normal"><span className="mfd-label">SHIP</span></th>
                  <th className="px-4 py-2 font-normal"><span className="mfd-label">MFR</span></th>
                  <th className="px-4 py-2 font-normal"><span className="mfd-label">OWNER</span></th>
                  <th className="px-4 py-2 font-normal"><span className="mfd-label">QTY</span></th>
                  {canCommand && <th className="px-4 py-2 font-normal"></th>}
                </tr>
              </thead>
              <tbody>
                {orgShips.map((ship) => {
                  const isOwn = ship.ownerMembershipId === viewer.id;
                  return (
                    <tr key={ship.id} className="border-b border-border/40 hover:bg-primary/5 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          {ship.imageUrl && ship.imageUrl.startsWith("http") && (
                            <img
                              src={ship.imageUrl}
                              alt={ship.shipName}
                              className="h-8 w-12 shrink-0 object-cover"
                            />
                          )}
                          <div>
                            <span className="font-medium text-text-primary">{ship.shipName}</span>
                            {!ship.isPublic && isOwn && (
                              <span className="ml-2 rounded bg-surface-elevated px-1.5 py-0.5 text-xs text-text-muted">
                                PRIVATE
                              </span>
                            )}
                            {ship.notes && (
                              <p className="mt-0.5 text-xs text-text-muted whitespace-pre-wrap">
                                {ship.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {ship.manufacturer ?? <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">{ship.ownerName}</td>
                      <td className="px-4 py-2.5 font-mono text-amber">{ship.quantity}</td>
                      {canCommand && (
                        <td className="px-4 py-2.5">
                          {!isOwn && (
                            <ModerateDeleteButton shipId={ship.id} shipName={ship.shipName} />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </MfdPanel>

      {/* My Fleet */}
      <MfdPanel
        chassis="amber"
        title={<span>[ MY HANGAR ]</span>}
        titleAside={<span className="mfd-label">{myShips.length} SHIPS</span>}
        bodyPadding="md"
      >
        {myShips.length === 0 ? (
          <p className="mb-4 text-sm text-text-muted">No ships registered. Add one below.</p>
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
                      <span className="font-semibold text-text-primary">{ship.shipName}</span>
                      {ship.manufacturer && (
                        <span className="text-sm text-text-secondary">{ship.manufacturer}</span>
                      )}
                      {!ship.isPublic && (
                        <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-text-muted">
                          PRIVATE
                        </span>
                      )}
                      <span className="mfd-label">QTY: <span className="font-mono text-amber">{ship.quantity}</span></span>
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
  );
}
