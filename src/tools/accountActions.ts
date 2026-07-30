import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { McpAgentToolParamsModel } from "../models/McpAgentModel";
import { AccountSchema } from "../schemas/AccountSchema";
import {
  createErrorResponse,
  getTagManagerClient,
  guardWrite,
  log,
} from "../utils";
import type { AuthSession } from "../utils/AuthSession";

const PayloadSchema = AccountSchema.omit({
  accountId: true,
});

export const accountActions = (
  server: McpServer,
  { props }: McpAgentToolParamsModel,
): void => {
  // There is no create or delete here because the Tag Manager API has no
  // accounts.create and no accounts.delete. Creating an account exists only in
  // the GTM interface, behind a Terms of Service acceptance. So 'update' is
  // the only write this tool can ever do, and it is classified as destructive
  // because renaming a client's account is confusing to undo and affects
  // everyone who works in it.
  server.tool(
    "gtm_account",
    "Performs all account-related operations: get, list, update. Use the 'action' parameter to select the operation. Accounts cannot be created or deleted through the API.",
    {
      action: z
        .enum(["get", "list", "update"])
        .describe(
          "The account operation to perform. Must be one of: 'get', 'list', 'update'. 'update' renames the account or changes its settings and requires a double confirmation.",
        ),
      accountId: z.string().describe("The unique ID of the GTM Account."),
      config: PayloadSchema.optional().describe(
        "Configuration for 'update' action. All fields correspond to the GTM Account resource.",
      ),
      confirm: z
        .boolean()
        .optional()
        .describe(
          "Set to true to execute a write against a live account. Leave it out first: the tool then reports which GTM account would be modified, so it can be checked before anything changes.",
        ),
      confirmTarget: z
        .string()
        .optional()
        .describe(
          "Second confirmation for destructive actions. The tool's first response prints the exact phrase to send back here, for example 'RENAME Kinedo'. It cannot be produced without having seen the resolved account name.",
        ),
    },
    async ({ action, accountId, config, confirm, confirmTarget }) => {
      log(`Running tool: gtm_account with action ${action}`);

      try {
        const tagmanager = await getTagManagerClient(props);

        // props is typed as a union for upstream-merge compatibility, but
        // init() only ever passes an AuthSession.
        const guard = await guardWrite({
          session: props as AuthSession,
          client: tagmanager,
          tool: "gtm_account",
          action,
          accountId,
          description: `${action} account`,
          confirm,
          confirmTarget,
        });
        if (!guard.allowed) {
          return guard.response;
        }

        switch (action) {
          case "get": {
            if (!accountId) {
              throw new Error(`accountId is required for ${action} action`);
            }

            const response = await tagmanager.accounts.get({
              path: `accounts/${accountId}`,
            });
            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          case "list": {
            const response = await tagmanager.accounts.list({});
            return {
              content: [
                { type: "text", text: JSON.stringify(response.data, null, 2) },
              ],
            };
          }
          case "update": {
            if (!accountId) {
              throw new Error(`accountId is required for ${action} action`);
            }

            if (!config) {
              throw new Error(`config is required for ${action} action`);
            }

            const response = await tagmanager.accounts.update({
              path: `accounts/${accountId}`,
              requestBody: config,
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
          `Error performing ${action} on account`,
          error,
        );
      }
    },
  );
};
