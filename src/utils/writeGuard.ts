import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { google } from "googleapis";
import { WRITE_ACTIONS } from "../constants/writeActions";
import type { AuthSession, ResolvedTarget } from "./AuthSession";
import { log } from "./log";

type TagManagerClient = ReturnType<typeof google.tagmanager>;

/**
 * Never write here, whatever anyone confirms. Matches the prefixes Expliciet
 * already puts on retired containers in GTM, bracketed or not.
 */
const REFUSE_MARKER =
  /\(\s*(do not use|archive)\s*\)|^\s*(do not use|archive)\b/i;

/**
 * Write here without asking. A container or account named as a sandbox.
 *
 * The separator class matters. Expliciet's existing test container is called
 * "mcp-test-container", with hyphens, and a plain \s* would not match it. It
 * only behaved as a sandbox because the account name happened to be
 * "MCP TEST - geen klantdata" with spaces, so any renaming of that account
 * would have silently turned the sandbox into a confirmation prompt.
 */
const SANDBOX_MARKER = /mcp[\s_-]*test/i;

export type WriteVerdict = "refused" | "sandbox" | "needsConfirmation";

/**
 * Decide how a write to this target must be treated, from the names alone.
 *
 * The guardrail reads the naming convention the marketers already maintain
 * inside GTM rather than a list on our side. A list of accounts or containers
 * would have to be edited and deployed every time someone creates one, and
 * online@expliciet.be reaches dozens of GTM accounts that marketers create
 * themselves, so it would fall behind within a week.
 */
export function classifyTarget(target: ResolvedTarget): WriteVerdict {
  const names = [target.accountName, target.containerName].filter(
    (name): name is string => typeof name === "string" && name.length > 0,
  );

  // Refusal wins: if a name carries both markers, the restrictive reading is
  // the safe one.
  if (names.some((name) => REFUSE_MARKER.test(name))) {
    return "refused";
  }

  if (names.some((name) => SANDBOX_MARKER.test(name))) {
    return "sandbox";
  }

  return "needsConfirmation";
}

/** Whether this tool and action change something, per the WRITE_ACTIONS table. */
export function isWriteAction(tool: string, action: string): boolean {
  return WRITE_ACTIONS[tool]?.includes(action) ?? false;
}

export type GuardResult =
  | { allowed: true }
  | { allowed: false; response: CallToolResult };

function refuse(text: string): GuardResult {
  log("Write refused by the guardrail:", text);
  return {
    allowed: false,
    response: { isError: true, content: [{ type: "text", text }] },
  };
}

/**
 * Look up the human-readable names of a write target, once per session.
 *
 * Throws rather than returning a partial target: an unverifiable target is
 * not a safe target, and the caller turns this into a refusal.
 */
async function resolveTarget(
  session: AuthSession,
  client: TagManagerClient,
  accountId: string,
  containerId?: string,
): Promise<ResolvedTarget> {
  const key = containerId ? `${accountId}/${containerId}` : accountId;
  const cached = session.nameCache.get(key);
  if (cached) {
    return cached;
  }

  const account = await client.accounts.get({
    path: `accounts/${accountId}`,
  });
  const accountName = account.data?.name;
  if (!accountName) {
    throw new Error(`GTM returned no name for account ${accountId}`);
  }

  let containerName: string | undefined;
  let publicId: string | undefined;
  if (containerId) {
    const container = await client.accounts.containers.get({
      path: `accounts/${accountId}/containers/${containerId}`,
    });
    containerName = container.data?.name ?? undefined;
    publicId = container.data?.publicId ?? undefined;
    if (!containerName) {
      throw new Error(`GTM returned no name for container ${containerId}`);
    }
  }

  const resolved: ResolvedTarget = { accountName, containerName, publicId };
  session.nameCache.set(key, resolved);
  return resolved;
}

function describeTarget(target: ResolvedTarget): string {
  const container = target.containerName
    ? `\n  Container: ${target.containerName}${
        target.publicId ? ` (${target.publicId})` : ""
      }`
    : "";
  return `  Account:   ${target.accountName}${container}`;
}

/**
 * Decide whether a write may proceed, and if not, what to tell the agent.
 *
 * Reads pass straight through. Writes are classified from the GTM naming
 * convention: see classifyTarget and docs/GUARDRAILS.md in
 * Expliciet-BV/mcp-google-om.
 *
 * Fails closed. Every path that cannot establish what it is about to write to
 * refuses, including a missing accountId and a lookup that throws.
 */
export async function guardWrite({
  session,
  client,
  tool,
  action,
  accountId,
  containerId,
  description,
  confirm,
}: {
  session: AuthSession;
  client: TagManagerClient;
  tool: string;
  action: string;
  accountId?: string;
  containerId?: string;
  description: string;
  confirm?: boolean;
}): Promise<GuardResult> {
  if (!isWriteAction(tool, action)) {
    return { allowed: true };
  }

  if (!accountId) {
    return refuse(
      `Refused: ${tool} cannot perform '${action}' without an accountId, so there is no way to check which GTM account would be modified.`,
    );
  }

  let target: ResolvedTarget;
  try {
    target = await resolveTarget(session, client, accountId, containerId);
  } catch (error) {
    return refuse(
      `Refused: could not verify which GTM account and container this would modify, so nothing was changed. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const verdict = classifyTarget(target);

  if (verdict === "refused") {
    return refuse(
      `Refused: this target is marked as retired or not to be used, and writing to it is never allowed.\n${describeTarget(
        target,
      )}\n  Blocked action: ${description}\nRemove the '(archive)' or '(do not use)' marker from the name in GTM if this really should be editable.`,
    );
  }

  if (verdict === "sandbox") {
    return { allowed: true };
  }

  if (confirm) {
    return { allowed: true };
  }

  // Deliberately not isError: this is a question, not a failure, and agents
  // retry errors instead of answering questions.
  return {
    allowed: false,
    response: {
      content: [
        {
          type: "text",
          text: `This would modify a LIVE container.\n${describeTarget(
            target,
          )}\n  Action:    ${description}\nNothing has been changed. Call ${tool} again with confirm: true to execute, after checking that the account and container above are the intended ones.`,
        },
      ],
    },
  };
}
