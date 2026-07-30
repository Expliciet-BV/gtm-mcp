import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tagmanager_v2 } from "googleapis";
import { z } from "zod";
import { McpAgentToolParamsModel } from "../models/McpAgentModel";
import type { AuthSession } from "../utils/AuthSession";
import { CombineConfigSchema } from "../schemas/CombineConfigSchema";
import { ContainerSchema } from "../schemas/ContainerSchema";
import { MoveTagIdConfigSchema } from "../schemas/MoveTagIdConfigSchema";
import {
  createErrorResponse,
  getTagManagerClient,
  guardWrite,
  log,
  paginateArray,
} from "../utils";
import Schema$Container = tagmanager_v2.Schema$Container;

const ContainerPayloadSchema = ContainerSchema.omit({
  accountId: true,
  containerId: true,
  fingerprint: true,
});

const MoveTagIdConfigPayloadSchema = MoveTagIdConfigSchema.omit({
  accountId: true,
  containerId: true,
});

const CombineConfigPayloadSchema = CombineConfigSchema.omit({
  accountId: true,
});

const ITEMS_PER_PAGE = 50;

export const containerActions = (
  server: McpServer,
  { props }: McpAgentToolParamsModel,
): void => {
  server.tool(
    "gtm_container",
    `Performs all container-related operations: create, get, update, remove, list, combine, lookup, moveTagId, snippet. The 'list' action returns up to itemsPerPage items per page.`,
    {
      // 'remove' deletes an entire container and is classified as destructive:
      // it needs confirm: true plus a confirmTarget challenge. See
      // docs/GUARDRAILS.md in Expliciet-BV/mcp-google-om.
      action: z
        .enum([
          "create",
          "get",
          "list",
          "update",
          "remove",
          "combine",
          "lookup",
          "moveTagId",
          "snippet",
        ])
        .describe(
          "The container operation to perform. Must be one of: 'create', 'get', 'list', 'update', 'remove', 'combine', 'lookup', 'moveTagId', 'snippet'. 'remove' deletes the whole container and requires a double confirmation.",
        ),
      accountId: z
        .string()
        .describe("The unique ID of the GTM Account containing the container."),
      containerId: z
        .string()
        .optional()
        .describe(
          "The unique ID of the GTM Container. Required for 'get', 'update', 'remove', 'combine', 'lookup', 'moveTagId', and 'snippet' actions.",
        ),
      destinationId: z
        .string()
        .optional()
        .describe(
          "The destination ID linked to a GTM Container (e.g., AW-123456789). Required for the 'lookup' action.",
        ),
      createOrUpdateConfig: ContainerPayloadSchema.optional().describe(
        "Configuration for 'create' and 'update' actions. All fields correspond to the GTM Container resource.",
      ),
      fingerprint: z
        .string()
        .optional()
        .describe(
          "The fingerprint for optimistic concurrency control. Required for 'update' action.",
        ),
      combineConfig: CombineConfigPayloadSchema.optional().describe(
        "Configuration for 'combine' action. Specifies which containers to combine.",
      ),
      moveTagIdConfig: MoveTagIdConfigPayloadSchema.optional().describe(
        "Configuration for 'moveTagId' action. Specifies tag ID mapping for moving tags between containers.",
      ),
      page: z
        .number()
        .min(1)
        .default(1)
        .describe(
          `Page number for pagination (starts from 1). Each page contains up to itemsPerPage items.`,
        ),
      itemsPerPage: z
        .number()
        .min(1)
        .max(ITEMS_PER_PAGE)
        .default(ITEMS_PER_PAGE)
        .describe(
          `Number of items to return per page (1-${ITEMS_PER_PAGE}). Default: ${ITEMS_PER_PAGE}. Use lower values if experiencing response issues.`,
        ),
      confirm: z
        .boolean()
        .optional()
        .describe(
          "Set to true to execute a write against a live container. Leave it out first: the tool then reports which GTM account and container would be modified, so it can be checked before anything changes. Targets in an 'MCP TEST' account or container execute without it, except for the destructive 'remove' action. Targets named '(archive)' or '(do not use)' are always refused.",
        ),
      confirmTarget: z
        .string()
        .optional()
        .describe(
          "Second confirmation, required for the destructive 'remove' action. The tool's first response prints the exact phrase to send back here, for example 'DELETE GTM-N727FV95'. It cannot be produced without having seen the resolved container, so a guessed or swapped container ID fails here.",
        ),
    },
    async ({
      action,
      accountId,
      containerId,
      destinationId,
      createOrUpdateConfig,
      fingerprint,
      combineConfig,
      moveTagIdConfig,
      page,
      itemsPerPage,
      confirm,
      confirmTarget,
    }) => {
      log(`Running tool: gtm_container with action ${action}`);

      try {
        const tagmanager = await getTagManagerClient(props);

        // props is typed as a union for upstream-merge compatibility, but
        // init() only ever passes an AuthSession.
        const guard = await guardWrite({
          session: props as AuthSession,
          client: tagmanager,
          tool: "gtm_container",
          action,
          accountId,
          containerId,
          description: `${action} container`,
          confirm,
          confirmTarget,
        });
        if (!guard.allowed) {
          return guard.response;
        }

        switch (action) {
          case "create": {
            if (!createOrUpdateConfig) {
              throw new Error(
                `createOrUpdateConfig is required for ${action} action`,
              );
            }

            const response = await tagmanager.accounts.containers.create({
              parent: `accounts/${accountId}`,
              requestBody: createOrUpdateConfig,
            });
            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          case "get": {
            if (!accountId) {
              throw new Error(`accountId is required for ${action} action`);
            }

            if (!containerId) {
              throw new Error(`containerId is required for ${action} action`);
            }

            const response = await tagmanager.accounts.containers.get({
              path: `accounts/${accountId}/containers/${containerId}`,
            });
            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          case "update": {
            if (!createOrUpdateConfig) {
              throw new Error(
                `createOrUpdateConfig is required for ${action} action`,
              );
            }

            if (!containerId) {
              throw new Error(`containerId is required for ${action} action`);
            }

            if (!fingerprint) {
              throw new Error(`fingerprint is required for ${action} action`);
            }

            const response = await tagmanager.accounts.containers.update({
              path: `accounts/${accountId}/containers/${containerId}`,
              fingerprint,
              requestBody: createOrUpdateConfig,
            });
            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          case "remove": {
            if (!accountId) {
              throw new Error(`accountId is required for ${action} action`);
            }

            if (!containerId) {
              throw new Error(`containerId is required for ${action} action`);
            }

            await tagmanager.accounts.containers.delete({
              path: `accounts/${accountId}/containers/${containerId}`,
            });
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      message: `Container ${containerId} was successfully deleted`,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
          case "list": {
            if (!accountId) {
              throw new Error(`accountId is required for ${action} action`);
            }

            let all: Schema$Container[] = [];
            let currentPageToken = "";

            do {
              const response = await tagmanager.accounts.containers.list({
                parent: `accounts/${accountId}`,
                pageToken: currentPageToken,
              });

              if (response.data.container) {
                all = all.concat(response.data.container);
              }

              currentPageToken = response.data.nextPageToken || "";
            } while (currentPageToken);

            const paginatedResult = paginateArray(all, page, itemsPerPage);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(paginatedResult, null, 2),
                },
              ],
            };
          }
          case "combine": {
            if (!combineConfig) {
              throw new Error(`combineConfig is required for ${action} action`);
            }

            const {
              fromContainerId,
              toContainerId,
              allowUserPermissionFeatureUpdate,
              settingSource,
            } = combineConfig;

            const response = await tagmanager.accounts.containers.combine({
              path: `accounts/${accountId}/containers/${fromContainerId}`,
              containerId: toContainerId,
              allowUserPermissionFeatureUpdate,
              settingSource,
            });
            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          case "lookup": {
            if (!destinationId) {
              throw new Error(`destinationId is required for ${action} action`);
            }

            const response = await tagmanager.accounts.containers.lookup({
              destinationId,
            });
            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          case "moveTagId": {
            if (!containerId) {
              throw new Error(`containerId is required for ${action} action`);
            }

            if (!moveTagIdConfig) {
              throw new Error(
                `moveTagIdConfig is required for ${action} action`,
              );
            }

            const {
              tagId,
              tagName,
              allowUserPermissionFeatureUpdate,
              copySettings,
              copyTermsOfService,
              copyUsers,
            } = moveTagIdConfig;

            const response = await tagmanager.accounts.containers.move_tag_id({
              path: `accounts/${accountId}/containers/${containerId}`,
              tagId,
              tagName,
              allowUserPermissionFeatureUpdate,
              copySettings,
              copyTermsOfService,
              copyUsers,
            });
            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          case "snippet": {
            if (!accountId) {
              throw new Error(`accountId is required for ${action} action`);
            }

            if (!containerId) {
              throw new Error(`containerId is required for ${action} action`);
            }

            const response = await tagmanager.accounts.containers.snippet({
              path: `accounts/${accountId}/containers/${containerId}`,
            });
            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (error) {
        return createErrorResponse(
          `Error performing ${action} on container`,
          error,
        );
      }
    },
  );
};
