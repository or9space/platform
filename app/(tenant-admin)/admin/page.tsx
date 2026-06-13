export default function TenantAdminHome() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-neutral-400">Manage your org. <a className="underline" href="/admin/config">Configuration →</a></p>
    </div>
  );
}
