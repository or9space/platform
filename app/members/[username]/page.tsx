import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  Shield,
  Medal,
  MessageSquare,
  Calendar,
  Swords,
  BookOpen,
  TrendingUp,
  Star,
  FileText,
} from "lucide-react";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { getMemberByUsername } from "@/lib/queries/members";
import { getProfileData } from "@/lib/queries/profile";
import { Rank } from "@/components/rank";
import { ProfileEdit } from "./profile-edit";
import { MfdPanel, MfdReadout } from "@/components/ui/mfd";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDistanceShort(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const TIER_COLOR: Record<string, "success" | "info" | "warning" | "danger"> = {
  ENLISTED: "success",
  NCO: "info",
  OFFICER: "warning",
  COMMAND: "danger",
};

const OP_STATUS_COLOR: Record<
  string,
  "success" | "danger" | "warning" | "default"
> = {
  COMPLETED: "success",
  ACTIVE: "danger",
  BRIEFING: "warning",
  PLANNING: "default",
  DEBRIEFING: "info" as "default",
  ARCHIVED: "default",
};

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

  const profile = await getProfileData(ctx, member.id);

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-6">
      {/* Back link */}
      <Link
        href="/members"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Roster
      </Link>

      {/* Page header */}
      <PageHeader
        title="PERSONNEL FILE"
        subtitle={`@${member.username}`}
        icon={Users}
      />

      {/* ---------------------------------------------------------------- */}
      {/* IDENTIFICATION panel                                             */}
      {/* ---------------------------------------------------------------- */}
      <MfdPanel
        chassis="primary"
        title={<span>[ IDENTIFICATION ]</span>}
        bodyPadding="md"
      >
        <div className="flex items-start gap-5">
          {/* Avatar */}
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
                  <Badge variant={TIER_COLOR[member.tier] ?? "default"}>
                    <Rank tier={member.tier} />
                  </Badge>
                  <span className="mfd-label ml-1">({member.tier})</span>
                </div>
              </div>

              <div>
                <p className="mfd-label">ENROLLED</p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {formatDate(member.createdAt)}
                </p>
              </div>
            </div>

            {member.bio && (
              <div>
                <p className="mfd-label">BIO</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-text-secondary">
                  {member.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      </MfdPanel>

      {/* ---------------------------------------------------------------- */}
      {/* Stat readouts row                                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              <FileText className="h-3.5 w-3.5" />
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

        <MfdPanel
          chassis="amber"
          title={
            <>
              <Calendar className="h-3.5 w-3.5" />
              <span>[ EVENTS ]</span>
            </>
          }
          bodyPadding="sm"
        >
          <p className="mfd-readout text-2xl">{profile.eventRsvps.length}</p>
          <p className="mfd-label mt-0.5">RSVPs logged</p>
        </MfdPanel>

        <MfdPanel
          chassis="amber"
          title={
            <>
              <Swords className="h-3.5 w-3.5" />
              <span>[ OPS ]</span>
            </>
          }
          bodyPadding="sm"
        >
          <p className="mfd-readout text-2xl">
            {profile.operationSignups.length}
          </p>
          <p className="mfd-label mt-0.5">operations signed</p>
        </MfdPanel>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* LOOT STANDING panel                                              */}
      {/* ---------------------------------------------------------------- */}
      {profile.loot ? (
        <MfdPanel
          chassis="amber"
          title={
            <>
              <Star className="h-3.5 w-3.5" />
              <span>[ LOOT STANDING ]</span>
            </>
          }
          bodyPadding="md"
        >
          <div className="flex flex-wrap gap-8">
            <MfdReadout
              label="BALANCE"
              value={(profile.loot.balanceTenths / 10).toFixed(1)}
              tone="amber"
              size="lg"
              aside="pts"
            />
            <MfdReadout
              label="RANK"
              value={`#${profile.loot.rank}`}
              tone="primary"
              size="lg"
            />
          </div>
        </MfdPanel>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {/* Main 2-col grid                                                  */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* AWARDS */}
        <MfdPanel
          chassis="primary"
          title={
            <>
              <Medal className="h-3.5 w-3.5" />
              <span>[ AWARDS & COMMENDATIONS ]</span>
            </>
          }
          bodyPadding="md"
          titleAside={
            profile.awards.length > 0 ? (
              <span className="mfd-readout">{profile.awards.length}</span>
            ) : undefined
          }
        >
          {profile.awards.length === 0 ? (
            <p className="mfd-label">NO AWARDS ON RECORD</p>
          ) : (
            <div className="space-y-3">
              {profile.awards.map((a) => (
                <div
                  key={a.id}
                  className="rounded border border-border/50 bg-surface-elevated/40 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Medal className="h-4 w-4 text-amber shrink-0" />
                    <span className="font-medium text-text-primary text-sm">
                      {a.name}
                    </span>
                  </div>
                  {a.note && (
                    <p className="mt-1 text-xs text-text-muted">{a.note}</p>
                  )}
                  <p className="mt-1 mfd-label">{formatDate(a.awardedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </MfdPanel>

        {/* HANDBOOK ACKNOWLEDGEMENTS */}
        <MfdPanel
          chassis="neutral"
          title={
            <>
              <BookOpen className="h-3.5 w-3.5" />
              <span>[ HANDBOOK SIGN-OFFS ]</span>
            </>
          }
          bodyPadding="md"
          titleAside={
            profile.handbookAcks.length > 0 ? (
              <span className="mfd-readout">{profile.handbookAcks.length}</span>
            ) : undefined
          }
        >
          {profile.handbookAcks.length === 0 ? (
            <p className="mfd-label">NO HANDBOOKS ACKNOWLEDGED</p>
          ) : (
            <div className="space-y-2">
              {profile.handbookAcks.map((ack) => (
                <div
                  key={ack.id}
                  className="flex items-center justify-between gap-3 rounded border border-border/50 bg-surface-elevated/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text-primary">
                      {ack.handbookTitle}
                    </p>
                    <p className="mfd-label">v{ack.versionRead}</p>
                  </div>
                  <span className="mfd-label shrink-0">
                    {formatDate(ack.acknowledgedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </MfdPanel>

        {/* EVENT ATTENDANCE */}
        <MfdPanel
          chassis="neutral"
          title={
            <>
              <Calendar className="h-3.5 w-3.5" />
              <span>[ EVENT ATTENDANCE ]</span>
            </>
          }
          bodyPadding="md"
        >
          {profile.eventRsvps.length === 0 ? (
            <p className="mfd-label">NO EVENT ATTENDANCE ON RECORD</p>
          ) : (
            <div className="space-y-2">
              {profile.eventRsvps.map((rsvp) => (
                <Link
                  key={rsvp.id}
                  href={`/events/${rsvp.eventId}`}
                  className="flex items-center justify-between gap-3 rounded border border-border/50 p-2 transition-colors hover:border-primary/40 hover:bg-surface-elevated/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {rsvp.title}
                    </p>
                    <p className="mfd-label">
                      {formatDate(rsvp.startsAt)}{" "}
                      <span className="opacity-60">{rsvp.type}</span>
                    </p>
                  </div>
                  <Badge
                    variant={
                      rsvp.status === "GOING"
                        ? "success"
                        : rsvp.status === "MAYBE"
                          ? "warning"
                          : "default"
                    }
                    className="shrink-0"
                  >
                    {rsvp.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </MfdPanel>

        {/* OPERATION HISTORY */}
        <MfdPanel
          chassis="neutral"
          title={
            <>
              <Swords className="h-3.5 w-3.5" />
              <span>[ OPERATION HISTORY ]</span>
            </>
          }
          bodyPadding="md"
        >
          {profile.operationSignups.length === 0 ? (
            <p className="mfd-label">NO OPERATION HISTORY ON RECORD</p>
          ) : (
            <div className="space-y-2">
              {profile.operationSignups.map((sig) => (
                <Link
                  key={sig.id}
                  href={`/operations/${sig.operationId}`}
                  className="flex items-center justify-between gap-3 rounded border border-border/50 p-2 transition-colors hover:border-primary/40 hover:bg-surface-elevated/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {sig.title}
                    </p>
                    <p className="mfd-label">
                      {sig.role ? `Role: ${sig.role}` : "No role assigned"}
                      {sig.scheduledAt && (
                        <> &bull; {formatDate(sig.scheduledAt)}</>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={OP_STATUS_COLOR[sig.status] ?? "default"}
                    className="shrink-0"
                  >
                    {sig.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </MfdPanel>

        {/* RECENT FORUM ACTIVITY — full width */}
        <MfdPanel
          chassis="neutral"
          title={
            <>
              <MessageSquare className="h-3.5 w-3.5" />
              <span>[ RECENT FORUM ACTIVITY ]</span>
            </>
          }
          bodyPadding="md"
          className="lg:col-span-2"
        >
          {profile.forumActivity.recentThreads.length === 0 &&
          profile.forumActivity.recentPosts.length === 0 ? (
            <p className="mfd-label">NO FORUM ACTIVITY ON RECORD</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Threads started */}
              {profile.forumActivity.recentThreads.length > 0 && (
                <div>
                  <p className="mfd-label mb-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> THREADS STARTED
                  </p>
                  <div className="space-y-2">
                    {profile.forumActivity.recentThreads.map((t) => (
                      <Link
                        key={t.id}
                        href={`/forums/${t.categorySlug}/${t.id}`}
                        className="block rounded border border-border/50 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-surface-elevated/40"
                      >
                        <p className="font-medium text-text-primary line-clamp-1">
                          {t.title}
                        </p>
                        <p className="mfd-label mt-0.5">
                          {t.postCount} replies &bull;{" "}
                          {formatDistanceShort(t.createdAt)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent posts */}
              {profile.forumActivity.recentPosts.length > 0 && (
                <div>
                  <p className="mfd-label mb-2 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> RECENT POSTS
                  </p>
                  <div className="space-y-2">
                    {profile.forumActivity.recentPosts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/forums/${p.categorySlug}/${p.threadId}`}
                        className="block rounded border border-border/50 px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-surface-elevated/40"
                      >
                        <p className="font-medium text-text-primary line-clamp-1">
                          {p.threadTitle}
                        </p>
                        <p className="line-clamp-1 text-xs text-text-muted mt-0.5">
                          {p.snippet}
                        </p>
                        <p className="mfd-label mt-0.5">
                          {formatDistanceShort(p.createdAt)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </MfdPanel>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Edit panel — own profile only                                    */}
      {/* ---------------------------------------------------------------- */}
      {isOwnProfile && (
        <MfdPanel
          chassis="neutral"
          title={<span>[ EDIT PROFILE ]</span>}
          bodyPadding="md"
        >
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
