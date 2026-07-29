import { describe, expect, it } from "vitest";
import { classifyTarget, isWriteAction } from "../src/utils/writeGuard";

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
