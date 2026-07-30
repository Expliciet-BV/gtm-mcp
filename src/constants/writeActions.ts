/**
 * Which actions of which tool change something in GTM.
 *
 * One table rather than a flag per tool, so every tool's guard call is
 * identical and adding a tool means adding a line here. Read-only actions are
 * absent on purpose: an action missing from this table is never guarded.
 *
 * Kept in sync by hand. docs/GUARDRAILS.md in Expliciet-BV/mcp-google-om
 * carries the checklist for adding a tool.
 */
export const WRITE_ACTIONS: Record<string, readonly string[]> = {
  gtm_account: ["update"],
  gtm_built_in_variable: ["create", "remove", "revert"],
  gtm_client: ["create", "update", "remove", "revert"],
  gtm_container: ["create", "update", "remove", "combine", "moveTagId"],
  gtm_user_permission: ["create", "update", "remove"],
  gtm_destination: ["link", "unlink"],
  gtm_environment: ["create", "update", "remove", "reauthorize"],
  gtm_folder: ["create", "update", "remove", "revert", "moveEntitiesToFolder"],
  gtm_gtag_config: ["create", "update", "remove"],
  gtm_tag: ["create", "update", "remove", "revert"],
  gtm_template: ["create", "update", "remove", "revert"],
  gtm_transformation: ["create", "update", "remove", "revert"],
  gtm_trigger: ["create", "update", "remove", "revert"],
  gtm_variable: ["create", "update", "remove", "revert"],
  gtm_version: ["publish", "remove", "setLatest", "undelete", "update"],
  gtm_workspace: [
    "create",
    "update",
    "remove",
    "createVersion",
    "sync",
    "quickPreview",
    "resolveConflict",
  ],
  gtm_zone: ["create", "update", "remove", "revert"],
};

/**
 * The subset of writes that no version rollback undoes, and the verb each one
 * uses in its confirmation challenge.
 *
 * Deleting a tag is not here on purpose: it lives in a workspace, the previous
 * container version still holds it, and it is recoverable. Deleting a whole
 * container, handing someone access to a client's data, and renaming an
 * account are not recoverable in that sense.
 *
 * Every action listed here must also appear in WRITE_ACTIONS above.
 * docs/GUARDRAILS.md in Expliciet-BV/mcp-google-om explains the flow.
 */
export const DESTRUCTIVE_ACTIONS: Record<
  string,
  Readonly<Record<string, string>>
> = {
  gtm_container: { remove: "DELETE" },
  gtm_user_permission: {
    create: "GRANT",
    update: "CHANGE",
    remove: "REVOKE",
  },
  gtm_account: { update: "RENAME" },
};
