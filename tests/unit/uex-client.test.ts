import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uexGet, uexTokenConfigured, UexError } from "@/lib/uex/client";

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response> | Response) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}
function json(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe("uex client", () => {
  beforeEach(() => { delete process.env.UEX_API_TOKEN; });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("unwraps the {status,data} envelope and builds the right URL + query", async () => {
    const fetchMock = mockFetch(() => json({ status: "ok", data: [{ id: 1 }] }));
    const data = await uexGet<{ id: number }[]>("commodities_prices", { query: { id_commodity: 7, skip: undefined } });
    expect(data).toEqual([{ id: 1 }]);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe("https://api.uexcorp.uk/2.0/commodities_prices?id_commodity=7");
  });

  it("sends a Bearer header only when UEX_API_TOKEN is set", async () => {
    let fetchMock = mockFetch(() => json({ status: "ok", data: [] }));
    await uexGet("commodities");
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty("Authorization");

    process.env.UEX_API_TOKEN = "secret";
    fetchMock = mockFetch(() => json({ status: "ok", data: [] }));
    await uexGet("commodities");
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer secret" });
  });

  it("throws UexError on non-ok HTTP", async () => {
    mockFetch(() => json({}, false, 400));
    await expect(uexGet("commodities_prices")).rejects.toBeInstanceOf(UexError);
  });

  it("throws UexError when status is not ok", async () => {
    mockFetch(() => json({ status: "error", data: null }));
    await expect(uexGet("commodities")).rejects.toBeInstanceOf(UexError);
  });

  it("throws UexError when the network call fails", async () => {
    mockFetch(() => { throw new Error("ECONNREFUSED"); });
    await expect(uexGet("commodities")).rejects.toBeInstanceOf(UexError);
  });

  it("uexTokenConfigured reflects the env var", () => {
    delete process.env.UEX_API_TOKEN;
    expect(uexTokenConfigured()).toBe(false);
    process.env.UEX_API_TOKEN = "x";
    expect(uexTokenConfigured()).toBe(true);
  });
});
