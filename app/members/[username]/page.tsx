import { notFound } from "next/navigation";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { getMemberByUsername } from "@/lib/queries/members";
import { Rank } from "@/components/rank";
import { ProfileEdit } from "./profile-edit";
import { MfdPanel } from "@/components/ui/mfd";
import { Users, MessageSquare, BookOpen, Shield, ArrowLeft } from "lucide-react";

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
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Breadcrumb / back link */}
      <a
        href="/members"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Roster
      </a>

      {/* Page header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-border bg-surface-elevated mfd-cut-tl-br text-primary">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {member.displayName ?? member.username}
          </h1>
          <p className="text-sm text-text-muted">PERSONNEL FILE</p>
        </div>
      </div>

      {/* Identity panel */}
      <MfdPanel
        chassis="primary"
        title={<span>[ IDENTIFICATION ]</span>}
        bodyPadding="md"
      >
        <div className="flex items-start gap-5">
          {/* Avatar with mfd-cut clip */}
          <div className="shrink-0">
            {member.avatarUrl && member.avatarUrl.startsWith("http") ? (
              <img
                src={member.avatarUrl}
                alt={member.displayName ?? member.username}
                className="h-20 w-20 border border-border-light object-cover mfd-cut-tl-br"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center border border-border-light bg-surface-elevated text-3xl font-semibold uppercase text-text-secondary mfd-cut-tl-br">
                {(member.displayName ?? member.username).slice(0, 1)}
              </div>
            )}
          </div>

          {/* Identity fields */}
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="mfd-label">CALLSIGN</p>
              <p className="text-xl font-bold text-text-primary">
                {member.displayName ?? member.username}
              </p>
              <p className="mfd-label mt-0.5">@{member.username}</p>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <div>
                <p className="mfd-label">RANK / TIER</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-text-secondary">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <Rank tier={member.tier} />
                  <span className="mfd-label ml-1">({member.tier})</span>
                </div>
              </div>

              <div>
                <p className="mfd-label">ENROLLED</p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {member.createdAt.toISOString().slice(0, 10)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </MfdPanel>

      {/* Stat readouts row */}
      <div className="grid grid-cols-2 gap-3">
        <MfdPanel
          chassis="amber"
          title={
            <>
              <MessageSquare className="h-3.5 w-3.5" />
              <span>[ THREADS ]</span>
            </>
          }
          bodyPadding="sm"
        >
          <p className="mfd-readout text-2xl">{member.threadCount}</p>
          <p className="mfd-label mt-0.5">
            {member.threadCount === 1 ? "thread" : "threads"} started
          </p>
        </MfdPanel>

        <MfdPanel
          chassis="amber"
          title={
            <>
              <BookOpen className="h-3.5 w-3.5" />
              <span>[ POSTS ]</span>
            </>
          }
          bodyPadding="sm"
        >
          <p className="mfd-readout text-2xl">{member.postCount}</p>
          <p className="mfd-label mt-0.5">
            {member.postCount === 1 ? "post" : "posts"} made
          </p>
        </MfdPanel>
      </div>

      {/* Bio panel */}
      <MfdPanel chassis="neutral" title={<span>[ BIO ]</span>} bodyPadding="md">
        {member.bio ? (
          <p className="whitespace-pre-wrap text-sm text-text-secondary">{member.bio}</p>
        ) : (
          <p className="mfd-label">NO BIO ON FILE</p>
        )}
      </MfdPanel>

      {/* Edit panel — own profile only */}
      {isOwnProfile && (
        <MfdPanel chassis="neutral" title={<span>[ EDIT PROFILE ]</span>} bodyPadding="md">
          <ProfileEdit
            initial={{
              displayName: member.displayName,
              bio: member.bio,
              avatarUrl: member.avatarUrl,
            }}
          />
        </MfdPanel>
      )}
    </div>
  );
}
