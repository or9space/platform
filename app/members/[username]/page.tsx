import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { getMemberByUsername } from "@/lib/queries/members";
import { Rank } from "@/components/rank";
import { ProfileEdit } from "./profile-edit";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const full = await getFullTenantContext();
  if (!full) notFound();
  const { tenant } = full;

  const accountId = await getSessionAccountId();
  const viewer = await getViewerMembership(tenant.id, accountId);

  const ctx = makeTenantContext(tenant.id);
  const member = await getMemberByUsername(ctx, username);
  if (!member) notFound();

  const isOwnProfile = viewer?.username === member.username;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4 text-sm">
        <a href="/members" className="text-text-secondary hover:text-text-primary">
          Members
        </a>
        <span className="mx-2 text-text-muted">/</span>
        <span className="text-text-secondary">{member.displayName ?? member.username}</span>
      </div>

      <div className="rounded border border-border p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            {member.avatarUrl && member.avatarUrl.startsWith("http") ? (
              <img
                src={member.avatarUrl}
                alt={member.displayName ?? member.username}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated text-xl font-semibold uppercase">
                {(member.displayName ?? member.username).slice(0, 1)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{member.displayName ?? member.username}</h1>
            <p className="text-sm text-text-secondary">@{member.username}</p>
            <p className="mt-1 text-sm text-text-secondary">
              <Rank tier={member.tier} />
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Joined {member.createdAt.toISOString().slice(0, 10)}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          {member.bio ? (
            <p className="whitespace-pre-wrap text-sm">{member.bio}</p>
          ) : (
            <p className="text-sm text-text-muted">No bio yet.</p>
          )}
        </div>

        <div className="mt-4 flex gap-6 text-sm text-text-secondary">
          <span>
            <span className="font-semibold text-text-primary">{member.threadCount}</span>{" "}
            {member.threadCount === 1 ? "thread" : "threads"}
          </span>
          <span>
            <span className="font-semibold text-text-primary">{member.postCount}</span>{" "}
            {member.postCount === 1 ? "post" : "posts"}
          </span>
        </div>
      </div>

      {isOwnProfile && (
        <ProfileEdit
          initial={{
            displayName: member.displayName,
            bio: member.bio,
            avatarUrl: member.avatarUrl,
          }}
        />
      )}
    </main>
  );
}
