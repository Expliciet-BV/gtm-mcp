import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tagmanager_v2 } from "googleapis";
import { z } from "zod";
import { McpAgentToolParamsModel } from "../models/McpAgentModel";
import { UserPermissionSchema } from "../schemas/UserPermissionSchema";
import {
  createErrorResponse,
  getTagManagerClient,
  guardWrite,
  log,
  paginateArray,
} from "../utils";
import type { AuthSession } from "../utils/AuthSession";
import Schema$Account = tagmanager_v2.Schema$Account;
import Schema$UserPermission = tagmanager_v2.Schema$UserPermission;

const ITEMS_PER_PAGE = 50;

export const userPermissionActions = (
  server: McpServer,
  { props }: McpAgentToolParamsModel,
): void => {
  // Every write here is destructive: granting, changing or revoking someone's
  // access to a client's Tag Manager data is not undone by a version rollback,
  // and a wrong grant is the kind of mistake nobody notices. All three need
  // confirm: true plus a confirmTarget challenge, in a sandbox account too.
  // See docs/GUARDRAILS.md in Expliciet-BV/mcp-google-om.
  server.tool(
    "gtm_user_permission",
    `Performs all user permission operations: create, get, list, update, remove. The 'list' action returns up to ${ITEMS_PER_PAGE} items per page. Every write requires a double confirmation.`,
    {
      action: z
        .enum(["create", "get", "list", "update", "remove"])
        .describe(
          "The user permission operation to perform. Must be one of: 'create', 'get', 'list', 'update', 'remove'. 'create', 'update' and 'remove' change who can reach a client's data and require a double confirmation.",
        ),
      accountId: z
        .string()
        .describe(
          "The unique ID of the GTM Account containing the user permission.",
        ),
      userPermissionId: z
        .string()
        .optional()
        .describe(
          "The unique ID of the user permission. Required for 'get', 'update', and 'remove' actions.",
        ),
      createOrUpdateConfig: UserPermissionSchema.optional().describe(
        "Configuration for 'create' and 'update' actions. All fields correspond to the GTM user permission resource.",
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
          "Set to true to execute. Leave it out first: the tool then reports which GTM account would be affected, so it can be checked before anything changes.",
        ),
      confirmTarget: z
        .string()
        .optional()
        .describe(
          "Second confirmation, required for 'create', 'update' and 'remove'. The tool's first response prints the exact phrase to send back here, for example 'GRANT Klanten'. It cannot be produced without having seen the resolved account name.",
        ),
    },
    async ({
      action,
      accountId,
      userPermissionId,
      createOrUpdateConfig,
      page,
      itemsPerPage,
      confirm,
      confirmTarget,
    }) => {
      log(`Running tool: gtm_user_permission with action ${action}`);

      try {
        const tagmanager = await getTagManagerClient(props);

        // props is typed as a union for upstream-merge compatibility, but
        // init() only ever passes an AuthSession.
        const guard = await guardWrite({
          session: props as AuthSession,
          client: tagmanager,
          tool: "gtm_user_permission",
          action,
          accountId,
          description: `${action} user permission${
            createOrUpdateConfig?.emailAddress
              ? ` for ${createOrUpdateConfig.emailAddress}`
              : userPermissionId
                ? ` ${userPermissionId}`
                : ""
          }`,
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

            const response = await tagmanager.accounts.user_permissions.create({
              parent: `accounts/${accountId}`,
              requestBody: createOrUpdateConfig as Schema$UserPermission,
            });

            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          case "get": {
            if (!userPermissionId) {
              throw new Error(
                `userPermissionId is required for ${action} action`,
              );
            }

            const response = await tagmanager.accounts.user_permissions.get({
              path: `accounts/${accountId}/user_permissions/${userPermissionId}`,
            });

            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          case "list": {
            let all: Schema$Account[] = [];
            let currentPageToken = "";

            do {
              const response = await tagmanager.accounts.user_permissions.list({
                parent: `accounts/${accountId}`,
                pageToken: currentPageToken,
              });

              if (response.data.userPermission) {
                all = all.concat(response.data.userPermission);
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
          case "update": {
            if (!userPermissionId) {
              throw new Error(
                `userPermissionId is required for ${action} action`,
              );
            }

            if (!createOrUpdateConfig) {
              throw new Error(
                `createOrUpdateConfig is required for ${action} action`,
              );
            }

            const response = await tagmanager.accounts.user_permissions.update({
              path: `accounts/${accountId}/user_permissions/${userPermissionId}`,
              requestBody: createOrUpdateConfig as Schema$UserPermission,
            });

            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          case "remove": {
            if (!userPermissionId) {
              throw new Error(
                `userPermissionId is required for ${action} action`,
              );
            }

            await tagmanager.accounts.user_permissions.delete({
              path: `accounts/${accountId}/user_permissions/${userPermissionId}`,
            });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      message: `User permission ${userPermissionId} was successfully deleted`,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (error) {
        return createErrorResponse(
          `Error performing ${action} on user permission`,
          error,
        );
      }
    },
  );
};
