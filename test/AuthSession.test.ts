import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthSession } from "../src/utils/AuthSession";
import type { McpAgentPropsModel } from "../src/models/McpAgentModel";

const NOW = 1_800_000_000; // fixed clock, seconds
const env = {
  GOOGLE_CLIENT_ID: "cid",
  GOOGLE_CLIENT_SECRET: "csecret",
} as unknown as Env;

function props(over: Partial<McpAgentPropsModel> = {}): McpAgentPropsModel {
  return {
    userId: "u1",
    clientId: "mcp-client",
    name: "Marketeer",
    email: "online@expliciet.be",
    accessToken: "old-token",
    refreshToken: "refresh-token",
    expiresAt: NOW + 3600,
    ...over,
  };
}

function okRefresh(token = "new-token", expiresIn = 3600) {
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({ access_token: token, expires_in: expiresIn }),
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW * 1000);
});

describe("AuthSession", () => {
  it("exposes props through getters", () => {
    const session = new AuthSession(() => props(), env);
    expect(session.email).toBe("online@expliciet.be");
    expect(session.accessToken).toBe("old-token");
  });

  it("reads props live rather than capturing them", () => {
    let current = props({ accessToken: "first" });
    const session = new AuthSession(() => current, env);
    expect(session.accessToken).toBe("first");
    current = props({ accessToken: "second" });
    expect(session.accessToken).toBe("second");
  });

  it("returns the existing token when it has time left", async () => {
    const fetchMock = okRefresh();
    vi.stubGlobal("fetch", fetchMock);
    const session = new AuthSession(() => props(), env);
    await expect(session.validAccessToken()).resolves.toBe("old-token");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes when the token is within the safety margin", async () => {
    const fetchMock = okRefresh("fresh-token");
    vi.stubGlobal("fetch", fetchMock);
    const session = new AuthSession(() => props({ expiresAt: NOW + 30 }), env);
    await expect(session.validAccessToken()).resolves.toBe("fresh-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes when the token has already expired", async () => {
    vi.stubGlobal("fetch", okRefresh("fresh-token"));
    const session = new AuthSession(() => props({ expiresAt: NOW - 10 }), env);
    await expect(session.validAccessToken()).resolves.toBe("fresh-token");
  });

  it("serves the refreshed token on later calls without refreshing again", async () => {
    const fetchMock = okRefresh("fresh-token");
    vi.stubGlobal("fetch", fetchMock);
    const session = new AuthSession(() => props({ expiresAt: NOW - 10 }), env);
    await session.validAccessToken();
    await session.validAccessToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(session.accessToken).toBe("fresh-token");
  });

  it("collapses concurrent callers into one token exchange", async () => {
    const fetchMock = okRefresh("fresh-token");
    vi.stubGlobal("fetch", fetchMock);
    const session = new AuthSession(() => props({ expiresAt: NOW - 10 }), env);
    const results = await Promise.all([
      session.validAccessToken(),
      session.validAccessToken(),
      session.validAccessToken(),
    ]);
    expect(results).toEqual(["fresh-token", "fresh-token", "fresh-token"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("prefers a newer framework token over its own refreshed one", async () => {
    vi.stubGlobal("fetch", okRefresh("locally-refreshed", 60));
    let current = props({ expiresAt: NOW - 10 });
    const session = new AuthSession(() => current, env);
    await session.validAccessToken();
    expect(session.accessToken).toBe("locally-refreshed");
    // tokenExchangeCallback later writes a longer-lived token into props
    current = props({ accessToken: "framework-token", expiresAt: NOW + 3600 });
    expect(session.accessToken).toBe("framework-token");
  });

  it("keeps a rotated refresh token when Google returns one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          access_token: "fresh-token",
          expires_in: 3600,
          refresh_token: "rotated",
        }),
      })) as unknown as typeof fetch,
    );
    const session = new AuthSession(() => props({ expiresAt: NOW - 10 }), env);
    await session.validAccessToken();
    expect(session.refreshToken).toBe("rotated");
  });

  it("tells the marketer to sign in again when there is no refresh token", async () => {
    const session = new AuthSession(
      () => props({ refreshToken: undefined, expiresAt: NOW - 10 }),
      env,
    );
    await expect(session.validAccessToken()).rejects.toThrow(
      /sign in again at https:\/\/gtm-mcp\.expl\.be/i,
    );
  });

  it("explains the seven day Testing-mode expiry on invalid_grant", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () => '{"error":"invalid_grant"}',
      })) as unknown as typeof fetch,
    );
    const session = new AuthSession(() => props({ expiresAt: NOW - 10 }), env);
    await expect(session.validAccessToken()).rejects.toThrow(/seven days/i);
  });

  it("retries the refresh after a failure instead of caching the rejection", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, text: async () => "server blip" })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "second-try", expires_in: 3600 }),
      });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    const session = new AuthSession(() => props({ expiresAt: NOW - 10 }), env);
    await expect(session.validAccessToken()).rejects.toThrow();
    await expect(session.validAccessToken()).resolves.toBe("second-try");
  });
});
