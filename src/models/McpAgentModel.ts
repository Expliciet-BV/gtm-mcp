import type { AuthSession } from "../utils/AuthSession";

export type McpAgentPropsModel = {
  userId: string;
  name: string;
  email: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  clientId: string;
};

export type McpAgentToolParamsModel = {
  // At runtime this is always an AuthSession. The plain props type stays in
  // the union because AuthSession satisfies it structurally, so the tool files
  // that read props.clientId and friends need no changes.
  props: McpAgentPropsModel | AuthSession;
  env: Env;
};
