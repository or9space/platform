"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAttendanceAction } from "@/lib/actions/loot";
import { ATTENDANCE_STATUSES } from "@/lib/loot";
import type { AttendanceStatus } from "@/lib/loot";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
};

interface Props {
  sessionId: string;
  memberId: string;
  currentStatus: AttendanceStatus | undefined;
}

export function AttendanceCell({ sessionId, memberId, currentStatus }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as AttendanceStatus;
    startTransition(async () => {
      await setAttendanceAction({ sessionId, memberId, status });
      router.refresh();
    });
  }

  return (
    <select
      value={currentStatus ?? ""}
      onChange={handleChange}
      disabled={pending}
      className="rounded border border-border-light bg-surface px-2 py-1 text-sm disabled:opacity-50"
    >
      <option value="" disabled>
        — set —
      </option>
      {ATTENDANCE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
