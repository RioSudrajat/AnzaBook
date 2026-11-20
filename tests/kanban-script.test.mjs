import test from "node:test";
import assert from "node:assert/strict";
import {
  PROJECT_CONSTANTS,
  extractLinkedIssueNumbers,
  parseKanbanArgs,
  resolveTransitionForEvent,
} from "../scripts/kanban.mjs";

test("parseKanbanArgs maps add command fields to Project #1 IDs", () => {
  const parsed = parseKanbanArgs([
    "add",
    "16",
    "--status",
    "Ready",
    "--priority",
    "P0",
    "--area",
    "Web",
  ]);
  assert.equal(parsed.command, "add");
  assert.equal(parsed.issueNumber, 16);
  assert.equal(PROJECT_CONSTANTS.projectId, "PVT_kwHOCKLcDc4Bshbl");
  assert.equal(parsed.statusOptionId, "7a321ef4");
  assert.equal(parsed.priorityOptionId, "a78d6bb3");
  assert.equal(parsed.areaOptionId, "6ade92d2");
});

test("parseKanbanArgs maps move command status to In Progress option ID", () => {
  const parsed = parseKanbanArgs(["move", "16", "In Progress"]);
  assert.equal(parsed.command, "move");
  assert.equal(parsed.issueNumber, 16);
  assert.equal(parsed.statusName, "In Progress");
  assert.equal(parsed.statusOptionId, "70eac02b");
});

test("parseKanbanArgs rejects unknown status names", () => {
  assert.throws(
    () => parseKanbanArgs(["move", "16", "NotAStatus"]),
    /Unknown status/i,
  );
});

test("resolveTransitionForEvent resolves PR lifecycle transitions", () => {
  assert.equal(
    resolveTransitionForEvent("pull_request", {
      action: "opened",
      pull_request: { draft: false },
    }),
    "In Review",
  );
  assert.equal(
    resolveTransitionForEvent("pull_request", {
      action: "opened",
      pull_request: { draft: true },
    }),
    "In Progress",
  );
  assert.equal(
    resolveTransitionForEvent("pull_request", {
      action: "ready_for_review",
      pull_request: { draft: false },
    }),
    "In Review",
  );
  assert.equal(
    resolveTransitionForEvent("pull_request", {
      action: "closed",
      pull_request: { merged: true },
    }),
    "Done",
  );
  assert.equal(
    resolveTransitionForEvent("issues", { action: "closed" }),
    "Done",
  );
});

test("extractLinkedIssueNumbers finds issue numbers from PR body and branch", () => {
  assert.deepEqual(
    extractLinkedIssueNumbers(
      "## Linked Issue\n\nCloses #16\nRelated to #4",
      "feat/16-arch-open-page-logo",
    ),
    [16],
  );
  assert.deepEqual(
    extractLinkedIssueNumbers("No closing keyword", "feat/16-arch-logo"),
    [16],
  );
});
