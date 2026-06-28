/** Join class names, dropping falsy values. Minimal `cn` (no deps). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
