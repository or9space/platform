import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Bell, CheckCheck, Info, MessageSquare, Award, Calendar,
  UserPlus, ChevronDown, Reply, Newspaper,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MfdPanel } from "@/components/ui/mfd";
import { getFullTenantContext } from "@/lib/server/get-tenant-config-full";
import { getSessionAccountId } from "@/lib/auth";
import { getViewerMembership } from "@/lib/authz";
import { makeTenantContext } from "@/lib/tenant";
import { listNotifications } from "@/lib/queries/notifications";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/actions/notifications";

export const metadata: Metadata = { title: "Notifications" };

const TYPE_ICONS: Record<string, typeof Bell> = {
  MESSAGE: MessageSquare,
  AWARD: Award,
  EVENT: Calendar,
  PROMOTION: UserPlus,
  DEMOTION: ChevronDown,
  FORUM_REPLY: Reply,
  NEWS: Newspaper,
  SYSTEM: Info,
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "JUST NOW";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}D AGO`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

export default async function NotificationsPage() {
  const ctx = await getFullTenantContext();
  if (!ctx) notFound();
  const viewer = await getViewerMembership(ctx.tenant.id, await getSessionAccountId());
  if (!viewer) notFound();

  const tenantCtx = makeTenantContext(ctx.tenant.id);
  const notifications = await listNotifications(tenantCtx, viewer.id);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="p-3 sm:p-6 animate-page-enter space-y-4">
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle="Activity and alerts for your account"
      />

      <MfdPanel
        chassis="neutral"
        bodyPadding="none"
        title={
          <>
            <Bell className="h-3 w-3 text-text-secondary" />
            <span>[ NOTIFICATIONS ]</span>
          </>
        }
        titleAside={
          <span className="flex items-center gap-2">
            <span className="mfd-readout text-[10px]">
              {unreadCount > 0 ? `${unreadCount} NEW` : "ALL READ"}
            </span>
            {unreadCount > 0 && (
              <form action={markAllNotificationsReadAction}>
                <button
                  type="submit"
                  className="flex items-center gap-1 mfd-label text-[10px] transition-colors hover:text-primary"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              </form>
            )}
          </span>
        }
      >
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Bell className="h-8 w-8 text-text-muted" />
            <p className="mfd-label">NO NOTIFICATIONS</p>
            <p className="text-xs text-text-muted">
              When ops fire, ranks change, or you get awards, they show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((notif) => {
              const Icon = TYPE_ICONS[notif.type] ?? Bell;
              const isUnread = !notif.readAt;

              const inner = (
                <div
                  className={[
                    "flex items-start gap-3 px-4 py-3 transition-colors",
                    isUnread
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "bg-surface hover:bg-surface-hover",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      isUnread
                        ? "bg-primary/20 text-primary"
                        : "bg-surface-elevated text-text-muted",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        "text-sm",
                        isUnread ? "font-medium text-text-primary" : "text-text-secondary",
                      ].join(" ")}
                    >
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="mt-0.5 text-xs text-text-muted">{notif.body}</p>
                    )}
                    <p className="mt-1 mfd-readout text-[10px]">{timeAgo(notif.createdAt)}</p>
                  </div>

                  {isUnread && (
                    <form
                      action={markNotificationReadAction.bind(null, notif.id)}
                      className="shrink-0"
                    >
                      <button
                        type="submit"
                        aria-label="Mark as read"
                        className="rounded p-1 text-text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <CheckCheck className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </form>
                  )}
                </div>
              );

              return (
                <li key={notif.id}>
                  {notif.href ? (
                    <a href={notif.href} className="block">
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </MfdPanel>
    </div>
  );
}
