/**
 * Transactional email. Uses Resend when RESEND_API_KEY is set; otherwise
 * logs to console so dev + self-host work with zero external accounts.
 * Resend is called over plain fetch — no SDK dependency.
 */
export interface EmailInput {
  to: string;
  subject: string;
  text: string;
}

type Transport = (msg: EmailInput & { from: string }) => Promise<{ id: string }>;

let transportOverride: Transport | null = null;

function resendTransport(apiKey: string): Transport {
  return async (msg) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return (await res.json()) as { id: string };
  };
}

export async function sendEmail(input: EmailInput): Promise<{ delivered: boolean }> {
  const from = process.env.RESEND_FROM_EMAIL ?? "hello@or9.space";
  const transport =
    transportOverride ??
    (process.env.RESEND_API_KEY ? resendTransport(process.env.RESEND_API_KEY) : null);
  if (!transport) {
    console.log("EMAIL (console fallback)", { from, ...input });
    return { delivered: false };
  }
  await transport({ from, ...input });
  return { delivered: true };
}

/** Test hook. */
export function _setEmailTransportForTests(t: Transport | null): void {
  transportOverride = t;
}
