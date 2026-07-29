import { describe, expect, it } from "vitest";
import {
  classifyTarget,
  guardWrite,
  isWriteAction,
} from "../src/utils/writeGuard";
import { AuthSession } from "../src/utils/AuthSession";

describe("classifyTarget", () => {
  it("refuses a container the agency marked (do not use)", () => {
    expect(
      classifyTarget({
        accountName: "Klanten",
        containerName: "(do not use) itc.be",
      }),
    ).toBe("refused");
  });

  it("refuses a container the agency marked (archive)", () => {
    expect(
      classifyTarget({
        accountName: "Klanten",
        containerName: "(archive) curtispark.be",
      }),
    ).toBe("refused");
  });

  it("refuses when the marker is on the account instead", () => {
    expect(classifyTarget({ accountName: "(archive) Oude klant" })).toBe(
      "refused",
    );
  });

  it("ignores case and inner spacing in the marker", () => {
    expect(
      classifyTarget({
        accountName: "Klanten",
        containerName: "( DO NOT USE ) seeya.be",
      }),
    ).toBe("refused");
  });

  it("accepts the marker without brackets at the start of a name", () => {
    expect(
      classifyTarget({
        accountName: "Klanten",
        containerName: "do not use - old container",
      }),
    ).toBe("refused");
  });

  it("does not treat an ordinary word as a marker", () => {
    expect(
      classifyTarget({
        accountName: "Kinedo",
        containerName: "Archived Reports Portal",
      }),
    ).toBe("needsConfirmation");
  });

  it("treats an MCP TEST account as a sandbox", () => {
    expect(
      classifyTarget({
        accountName: "MCP TEST - geen klantdata",
        containerName: "test container",
      }),
    ).toBe("sandbox");
  });

  it("treats an MCP TEST container inside an ordinary account as a sandbox", () => {
    expect(
      classifyTarget({
        accountName: "Sandbox Expliciet - geen klantdata",
        containerName: "MCP TEST scratch",
      }),
    ).toBe("sandbox");
  });

  it("ignores case in the sandbox marker", () => {
    expect(classifyTarget({ accountName: "mcp test playground" })).toBe(
      "sandbox",
    );
  });

  it("lets a refusal win over a sandbox marker", () => {
    // If both markers are present the safe reading is the restrictive one.
    expect(
      classifyTarget({
        accountName: "MCP TEST - geen klantdata",
        containerName: "(do not use) broken",
      }),
    ).toBe("refused");
  });

  it("requires confirmation for an ordinary client container", () => {
    expect(
      classifyTarget({
        accountName: "Kinedo",
        containerName: "www.kinedo.info",
      }),
    ).toBe("needsConfirmation");
  });

  it("requires confirmation for an account with no container in play", () => {
    expect(classifyTarget({ accountName: "Joseph Bricks" })).toBe(
      "needsConfirmation",
    );
  });
});

describe("isWriteAction", () => {
  it("recognises writes", () => {
    expect(isWriteAction("gtm_tag", "create")).toBe(true);
    expect(isWriteAction("gtm_version", "publish")).toBe(true);
    expect(isWriteAction("gtm_workspace", "createVersion")).toBe(true);
    expect(isWriteAction("gtm_destination", "link")).toBe(true);
  });

  it("recognises reads", () => {
    expect(isWriteAction("gtm_tag", "list")).toBe(false);
    expect(isWriteAction("gtm_tag", "get")).toBe(false);
    expect(isWriteAction("gtm_version_header", "latest")).toBe(false);
    expect(isWriteAction("gtm_workspace", "getStatus")).toBe(false);
  });

  it("treats an unknown tool as read-only rather than guessing", () => {
    // Guessing "write" would break reads; guessing "read" only means a new
    // tool ships unguarded, which the checklist in docs/GUARDRAILS.md catches.
    expect(isWriteAction("gtm_something_new", "create")).toBe(false);
  });
});

const env = {
  GOOGLE_CLIENT_ID: "cid",
  GOOGLE_CLIENT_SECRET: "csecret",
} as unknown as Env;

function session() {
  return new AuthSession(
    () => ({
      userId: "u1",
      clientId: "mcp-client",
      name: "Marketeer",
      email: "online@expliciet.be",
      accessToken: "token",
      refreshToken: "refresh",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    }),
    env,
  );
}

/** A googleapis stand-in returning the names we tell it to. */
function client(opts: {
  accountName?: string;
  containerName?: string;
  publicId?: string;
  accountThrows?: boolean;
  containerThrows?: boolean;
}) {
  const accountsGet = async () => {
    if (opts.accountThrows) throw new Error("account lookup blew up");
    return { data: { name: opts.accountName } };
  };
  const containersGet = async () => {
    if (opts.containerThrows) throw new Error("container lookup blew up");
    return { data: { name: opts.containerName, publicId: opts.publicId } };
  };
  return {
    accounts: {
      get: accountsGet,
      containers: { get: containersGet },
    },
  } as any;
}

function textOf(result: { response: { content: unknown[] } }): string {
  return (result.response.content[0] as { text: string }).text;
}

describe("guardWrite", () => {
  it("lets a read through untouched", async () => {
    const result = await guardWrite({
      session: session(),
      client: client({ accountName: "Kinedo" }),
      tool: "gtm_tag",
      action: "list",
      accountId: "1",
      containerId: "2",
      description: "list tags",
    });
    expect(result.allowed).toBe(true);
  });

  it("lets a sandbox write through without confirmation", async () => {
    const result = await guardWrite({
      session: session(),
      client: client({
        accountName: "MCP TEST - geen klantdata",
        containerName: "scratch",
        publicId: "GTM-N727FV95",
      }),
      tool: "gtm_tag",
      action: "create",
      accountId: "1",
      containerId: "2",
      description: 'create tag "GA4 - purchase"',
    });
    expect(result.allowed).toBe(true);
  });

  it("refuses a marked container even with confirm true", async () => {
    const result = await guardWrite({
      session: session(),
      client: client({
        accountName: "Klanten",
        containerName: "(do not use) itc.be",
        publicId: "GTM-WKRQ5D5",
      }),
      tool: "gtm_tag",
      action: "create",
      accountId: "1",
      containerId: "2",
      description: "create tag",
      confirm: true,
    });
    expect(result.allowed).toBe(false);
    if (result.allowed) return;
    expect(result.response.isError).toBe(true);
    expect(textOf(result)).toMatch(/\(do not use\) itc\.be/);
    expect(textOf(result)).toMatch(/refused/i);
  });

  it("asks for confirmation on a live container, naming it", async () => {
    const result = await guardWrite({
      session: session(),
      client: client({
        accountName: "Kinedo",
        containerName: "www.kinedo.info",
        publicId: "GTM-TMT5GG4",
      }),
      tool: "gtm_tag",
      action: "create",
      accountId: "1",
      containerId: "2",
      description: 'create tag "GA4 - purchase"',
    });
    expect(result.allowed).toBe(false);
    if (result.allowed) return;
    const text = textOf(result);
    expect(text).toMatch(/Kinedo/);
    expect(text).toMatch(/www\.kinedo\.info/);
    expect(text).toMatch(/GTM-TMT5GG4/);
    expect(text).toMatch(/GA4 - purchase/);
    expect(text).toMatch(/confirm: true/);
  });

  it("executes a live write once confirmed", async () => {
    const result = await guardWrite({
      session: session(),
      client: client({
        accountName: "Kinedo",
        containerName: "www.kinedo.info",
        publicId: "GTM-TMT5GG4",
      }),
      tool: "gtm_tag",
      action: "create",
      accountId: "1",
      containerId: "2",
      description: "create tag",
      confirm: true,
    });
    expect(result.allowed).toBe(true);
  });

  it("classifies on the account alone when no container is in play", async () => {
    const result = await guardWrite({
      session: session(),
      client: client({ accountName: "MCP TEST - geen klantdata" }),
      tool: "gtm_container",
      action: "create",
      accountId: "1",
      description: "create container",
    });
    expect(result.allowed).toBe(true);
  });

  it("refuses when the account lookup fails", async () => {
    const result = await guardWrite({
      session: session(),
      client: client({ accountThrows: true }),
      tool: "gtm_tag",
      action: "create",
      accountId: "1",
      containerId: "2",
      description: "create tag",
      confirm: true,
    });
    expect(result.allowed).toBe(false);
    if (result.allowed) return;
    expect(textOf(result)).toMatch(/could not verify/i);
  });

  it("refuses when the container lookup fails", async () => {
    const result = await guardWrite({
      session: session(),
      client: client({ accountName: "Kinedo", containerThrows: true }),
      tool: "gtm_tag",
      action: "create",
      accountId: "1",
      containerId: "2",
      description: "create tag",
      confirm: true,
    });
    expect(result.allowed).toBe(false);
    if (result.allowed) return;
    expect(textOf(result)).toMatch(/could not verify/i);
  });

  it("refuses when accountId is missing, rather than skipping the check", async () => {
    const result = await guardWrite({
      session: session(),
      client: client({ accountName: "Kinedo" }),
      tool: "gtm_tag",
      action: "create",
      description: "create tag",
      confirm: true,
    });
    expect(result.allowed).toBe(false);
  });

  it("refuses when GTM returns no name for the account", async () => {
    const result = await guardWrite({
      session: session(),
      client: client({ accountName: undefined }),
      tool: "gtm_tag",
      action: "create",
      accountId: "1",
      description: "create tag",
      confirm: true,
    });
    expect(result.allowed).toBe(false);
    if (result.allowed) return;
    expect(textOf(result)).toMatch(/could not verify/i);
  });

  it("resolves each target once per session", async () => {
    let accountCalls = 0;
    const counting = {
      accounts: {
        get: async () => {
          accountCalls += 1;
          return { data: { name: "MCP TEST - geen klantdata" } };
        },
        containers: {
          get: async () => ({ data: { name: "scratch", publicId: "GTM-X" } }),
        },
      },
    } as any;
    const shared = session();
    for (let i = 0; i < 3; i += 1) {
      await guardWrite({
        session: shared,
        client: counting,
        tool: "gtm_tag",
        action: "create",
        accountId: "1",
        containerId: "2",
        description: "create tag",
      });
    }
    expect(accountCalls).toBe(1);
  });
});
