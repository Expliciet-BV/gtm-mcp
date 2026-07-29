import { WRITE_ACTIONS } from "../constants/writeActions";
import type { ResolvedTarget } from "./AuthSession";

/**
 * Never write here, whatever anyone confirms. Matches the prefixes Expliciet
 * already puts on retired containers in GTM, bracketed or not.
 */
const REFUSE_MARKER =
  /\(\s*(do not use|archive)\s*\)|^\s*(do not use|archive)\b/i;

/** Write here without asking. A container or account named as a sandbox. */
const SANDBOX_MARKER = /mcp\s*test/i;

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
