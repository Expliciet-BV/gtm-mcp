import type { McpAgentPropsModel } from "../models/McpAgentModel";
import { refreshUpstreamAuthToken } from "./authorizeUtils";
import { log } from "./log";

/** Refresh once the token has less than this many seconds left. */
const SAFETY_MARGIN_SECONDS = 120;

const REAUTH_HINT =
  "Please sign in again at https://gtm-mcp.expl.be and reconnect this MCP client.";

/** A GTM account or container, resolved to its human-readable name. */
export type ResolvedTarget = {
  accountName: string;
  containerName?: string;
  publicId?: string;
};

/**
 * One marketer's Google credentials, for the lifetime of one Durable Object.
 *
 * Two things make this necessary rather than passing props directly:
 *
 *   1. src/index.ts registers tools once, in init(). Handing them this.props
 *      captures the object by reference, so when tokenExchangeCallback swaps
 *      this.props for a refreshed one, the tools keep reading the old token.
 *      Reading through a closure per call fixes that.
 *   2. getTagManagerClient used to throw once the token expired, failing a
 *      marketer's tool call mid-task. validAccessToken() refreshes instead.
 *
 * Deliberately per-instance rather than module scope: a single Workers isolate
 * can host several Durable Objects, so module state is not per session and two
 * marketers could end up sharing one token.
 */
export class AuthSession {
  /** Resolved GTM names, so writeGuard resolves each target once per session. */
  public readonly nameCache = new Map<string, ResolvedTarget>();

  /** A token this session refreshed itself. Never written back to the grant store. */
  private locallyRefreshed: McpAgentPropsModel | null = null;

  /** In-progress refresh, so concurrent tool calls share one token exchange. */
  private refreshInFlight: Promise<void> | null = null;

  constructor(
    // McpAgent types this.props as possibly undefined, which is honest: there
    // is a moment before authorization completes when there are no
    // credentials. We surface that as a re-authentication message rather than
    // asserting it away and failing later with a TypeError.
    private readonly readProps: () => McpAgentPropsModel | undefined,
    private readonly env: Env,
  ) {}

  /**
   * The framework's props, unless our own refreshed copy is newer.
   *
   * We never mutate this.props on the agent: tokenExchangeCallback owns that,
   * and it persists. Preferring whichever copy expires later means a durable
   * refresh always wins over our in-memory one, with no ordering assumptions.
   */
  private get current(): McpAgentPropsModel {
    const base = this.readProps();
    if (!base) {
      throw new Error(
        `This session is not signed in to Google. ${REAUTH_HINT}`,
      );
    }
    const mine = this.locallyRefreshed;
    if (mine && (mine.expiresAt ?? 0) > (base.expiresAt ?? 0)) {
      return mine;
    }
    return base;
  }

  get userId(): string {
    return this.current.userId;
  }

  get clientId(): string {
    return this.current.clientId;
  }

  get name(): string {
    return this.current.name;
  }

  get email(): string {
    return this.current.email;
  }

  get accessToken(): string {
    return this.current.accessToken;
  }

  get refreshToken(): string | undefined {
    return this.current.refreshToken;
  }

  get expiresAt(): number | undefined {
    return this.current.expiresAt;
  }

  /** An access token guaranteed usable now, refreshing first if needed. */
  public async validAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = this.current.expiresAt;

    if (expiresAt === undefined || expiresAt > now + SAFETY_MARGIN_SECONDS) {
      return this.current.accessToken;
    }

    if (!this.refreshInFlight) {
      // Cleared in a finally block so a failed refresh does not cache its
      // rejection and lock the session out for the rest of its life.
      this.refreshInFlight = this.refresh().finally(() => {
        this.refreshInFlight = null;
      });
    }

    await this.refreshInFlight;
    return this.current.accessToken;
  }

  private async refresh(): Promise<void> {
    const props = this.current;

    if (!props.refreshToken) {
      throw new Error(
        `Your Google sign-in has expired and there is no refresh token to renew it. ${REAUTH_HINT}`,
      );
    }

    log("Refreshing the Google access token for this session");

    const [token, error] = await refreshUpstreamAuthToken({
      clientId: this.env.GOOGLE_CLIENT_ID,
      clientSecret: this.env.GOOGLE_CLIENT_SECRET,
      refreshToken: props.refreshToken,
      upstreamUrl: "https://oauth2.googleapis.com/token",
    });

    if (!token) {
      // Expected roughly weekly: the OAuth app is in Testing mode, where
      // Google expires refresh tokens after seven days. Say so, rather than
      // presenting it as a fault.
      if (error?.includes("invalid_grant")) {
        throw new Error(
          `Your Google sign-in has expired. The consent screen is still in Testing mode, so Google invalidates it after seven days. ${REAUTH_HINT}`,
        );
      }
      throw new Error(
        `Could not renew your Google sign-in: ${error}. ${REAUTH_HINT}`,
      );
    }

    this.locallyRefreshed = {
      ...props,
      accessToken: token.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + token.expires_in,
      refreshToken: token.refresh_token || props.refreshToken,
    };
  }
}
