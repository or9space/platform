export const ATTENDANCE_POINTS: Record<"PRESENT" | "LATE" | "ABSENT", number> = {
  PRESENT: 10, LATE: 5, ABSENT: 0,
};
export const ATTENDANCE_STATUSES = ["PRESENT", "LATE", "ABSENT"] as const;
export const TXN_TYPES = ["SPEND", "TRANSFER_IN", "TRANSFER_OUT", "ADJUST"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type LootTxnType = (typeof TXN_TYPES)[number];

/** tenths -> human string: 25 -> "2.5", 10 -> "1", -15 -> "-1.5" */
export function formatPoints(tenths: number): string {
  const sign = tenths < 0 ? "-" : "";
  const abs = Math.abs(tenths);
  const whole = Math.trunc(abs / 10);
  const frac = abs % 10;
  return frac === 0 ? `${sign}${whole}` : `${sign}${whole}.${frac}`;
}
