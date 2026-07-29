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
  // gtm_account has no write actions left: update was removed with the
  // manage.accounts scope.
  gtm_built_in_variable: ["create", "remove", "revert"],
  gtm_client: ["create", "update", "remove", "revert"],
  // "remove" is absent: container deletion went with the delete.containers scope.
  gtm_container: ["create", "update", "combine", "moveTagId"],
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
