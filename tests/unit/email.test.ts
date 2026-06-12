import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, _setEmailTransportForTests } from "@/lib/email";

describe("sendEmail", () => {
  beforeEach(() => _setEmailTransportForTests(null));

  it("falls back to console logging when no transport (no RESEND_API_KEY)", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendEmail({ to: "x@example.com", subject: "Hi", text: "Body" });
    expect(result.delivered).toBe(false);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("EMAIL (console fallback)"), expect.anything());
    spy.mockRestore();
  });

  it("uses the injected transport when present", async () => {
    const fake = vi.fn(async () => ({ id: "msg_1" }));
    _setEmailTransportForTests(fake);
    const result = await sendEmail({ to: "x@example.com", subject: "Hi", text: "Body" });
    expect(result.delivered).toBe(true);
    expect(fake).toHaveBeenCalledWith({
      from: expect.any(String),
      to: "x@example.com",
      subject: "Hi",
      text: "Body",
    });
  });
});
