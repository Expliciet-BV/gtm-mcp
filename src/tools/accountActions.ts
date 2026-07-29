import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { McpAgentToolParamsModel } from "../models/McpAgentModel";
import { createErrorResponse, getTagManagerClient, log } from "../utils";

export const accountActions = (
  server: McpServer,
  { props }: McpAgentToolParamsModel,
): void => {
  // No guardWrite call and no confirm parameter: gtm_account is read-only
  // since the update action went with the manage.accounts scope. Add both if
  // a write action is ever added here, and add the action to WRITE_ACTIONS.
  server.tool(
    "gtm_account",
    "Performs all account-related operations: get, list. Use the 'action' parameter to select the operation.",
    {
      action: z
        .enum(["get", "list"])
        .describe(
          "The account operation to perform. Must be one of: 'get', 'list'.",
        ),
      accountId: z.string().describe("The unique ID of the GTM Account."),
    },
    async ({ action, accountId }) => {
      log(`Running tool: gtm_account with action ${action}`);

      try {
        const tagmanager = await getTagManagerClient(props);

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
