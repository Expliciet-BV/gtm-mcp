import { google } from "googleapis";
import type { AuthSession } from "./AuthSession";
import type { McpAgentPropsModel } from "../models/McpAgentModel";
import { log } from "./log";

type TagManagerClient = ReturnType<typeof google.tagmanager>;

/**
 * Upstream threw here once props.expiresAt had passed, which failed a
 * marketer's tool call in the middle of whatever they were doing. An
 * AuthSession renews the token instead. The plain-props branch stays for
 * type compatibility and simply uses the token as given.
 */
export async function getTagManagerClient(
  session: AuthSession | McpAgentPropsModel,
): Promise<TagManagerClient> {
  const token =
    "validAccessToken" in session
      ? await session.validAccessToken()
      : session.accessToken;

  try {
    return google.tagmanager({
      version: "v2",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    log("Error creating Tag Manager client:", error);
    throw error;
  }
}
