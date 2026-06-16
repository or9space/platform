import { SignupForm } from "./signup-form";

export const metadata = { title: "Start your org — or9.space" };

export default function StartOrgPage() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-2 text-3xl font-bold">Start your org</h1>
      <p className="mb-8 text-text-secondary">
        Free tier, reviewed by hand, live within a day. Your crew gets
        <code className="mx-1">yourname.or9.space</code> with forums, handbook,
        loot tracking, inventory, and more.
      </p>
      <SignupForm />
    </main>
  );
}
