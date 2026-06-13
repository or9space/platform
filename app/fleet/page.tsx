import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { hasTier } from "@/lib/permissions";
import { makeTenantContext } from "@/lib/tenant";
import { listOrgFleet, fleetStats } from "@/lib/queries/fleet";
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
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fleet</h1>
        <p className="text-sm text-neutral-400">
          {stats.totalShips} {stats.totalShips === 1 ? "ship" : "ships"} &middot;{" "}
          {stats.totalQuantity} total
        </p>
      </div>

      {/* Org Fleet */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Org Fleet</h2>
        {orgShips.length === 0 ? (
          <p className="text-neutral-400">No ships in the org fleet yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-neutral-500">
                  <th className="pb-2 pr-4 font-normal">Ship</th>
                  <th className="pb-2 pr-4 font-normal">Manufacturer</th>
                  <th className="pb-2 pr-4 font-normal">Owner</th>
                  <th className="pb-2 pr-4 font-normal">Qty</th>
                  {canCommand && <th className="pb-2 font-normal"></th>}
                </tr>
              </thead>
              <tbody>
                {orgShips.map((ship) => {
                  const isOwn = ship.ownerMembershipId === viewer.id;
                  return (
                    <tr key={ship.id} className="border-b border-neutral-900 hover:bg-neutral-900/40">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-3">
                          {ship.imageUrl && ship.imageUrl.startsWith("http") && (
                            <img
                              src={ship.imageUrl}
                              alt={ship.shipName}
                              className="h-8 w-12 rounded object-cover shrink-0"
                            />
                          )}
                          <div>
                            <span className="font-medium">{ship.shipName}</span>
                            {!ship.isPublic && isOwn && (
                              <span className="ml-2 rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">
                                Private
                              </span>
                            )}
                            {ship.notes && (
                              <p className="mt-0.5 text-xs text-neutral-500 whitespace-pre-wrap">
                                {ship.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-neutral-300">
                        {ship.manufacturer ?? <span className="text-neutral-600">—</span>}
                      </td>
                      <td className="py-2 pr-4 text-neutral-300">{ship.ownerName}</td>
                      <td className="py-2 pr-4 font-mono text-neutral-300">{ship.quantity}</td>
                      {canCommand && (
                        <td className="py-2">
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
      </section>

      {/* My Fleet */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">My Fleet</h2>
        {myShips.length === 0 ? (
          <p className="mb-4 text-neutral-400">You have no ships yet. Add one below.</p>
        ) : (
          <div className="mb-6 space-y-3">
            {myShips.map((ship) => (
              <div
                key={ship.id}
                className="rounded border border-neutral-800 p-4"
              >
                <div className="flex items-start gap-4">
                  {ship.imageUrl && ship.imageUrl.startsWith("http") && (
                    <img
                      src={ship.imageUrl}
                      alt={ship.shipName}
                      className="h-16 w-24 rounded object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{ship.shipName}</span>
                      {ship.manufacturer && (
                        <span className="text-sm text-neutral-400">{ship.manufacturer}</span>
                      )}
                      {!ship.isPublic && (
                        <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">
                          Private
                        </span>
                      )}
                      <span className="text-sm text-neutral-400">Qty: {ship.quantity}</span>
                    </div>
                    {ship.notes && (
                      <p className="mt-1 text-sm text-neutral-400 whitespace-pre-wrap">
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
      </section>
    </main>
  );
}
