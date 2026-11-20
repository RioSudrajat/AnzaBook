import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const PROJECT_CONSTANTS = {
  owner: "RioSudrajat",
  repo: "AnzaBook",
  projectNumber: 1,
  projectId: "PVT_kwHOCKLcDc4Bshbl",
  fields: {
    status: {
      id: "PVTSSF_lAHOCKLcDc4BshblzhqvN_w",
      options: {
        Backlog: "486c405a",
        Ready: "7a321ef4",
        "In Progress": "70eac02b",
        "In Review": "736ddad5",
        Done: "019e9bd1",
      },
    },
    priority: {
      id: "PVTSSF_lAHOCKLcDc4BshblzhqvoqQ",
      options: {
        P0: "a78d6bb3",
        "P0 Hackathon": "a78d6bb3",
        P1: "06107e40",
        "P1 Startup": "06107e40",
        P2: "4dc21509",
        "P2 Later": "4dc21509",
      },
    },
    area: {
      id: "PVTSSF_lAHOCKLcDc4BshblzhqvoqY",
      options: {
        Web: "6ade92d2",
        API: "fcf85094",
        Shared: "aa692d45",
        DevOps: "80e0c745",
        "DevOps & Security": "80e0c745",
        PM: "c72aa1f8",
        "Product / PM": "c72aa1f8",
      },
    },
  },
};

function requireOptionId(fieldKey, rawValue, label) {
  const options = PROJECT_CONSTANTS.fields[fieldKey].options;
  const optionId = options[rawValue];
  if (!optionId) {
    throw new Error(
      `Unknown ${label} "${rawValue}". Expected one of: ${Object.keys(options).join(", ")}`,
    );
  }
  return optionId;
}

function parseIssueNumber(raw) {
  const num = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`Invalid issue number: "${raw}"`);
  }
  return num;
}

export function parseKanbanArgs(argv) {
  const [command, rawIssue, ...rest] = argv;
  if (command === "sync-event") {
    return { command: "sync-event" };
  }
  if (command === "move") {
    const issueNumber = parseIssueNumber(rawIssue);
    const statusName = rest[0];
    if (!statusName) {
      throw new Error("Usage: node scripts/kanban.mjs move <issueNumber> <status>");
    }
    return {
      command,
      issueNumber,
      statusName,
      statusOptionId: requireOptionId("status", statusName, "status"),
    };
  }
  if (command === "add") {
    const issueNumber = parseIssueNumber(rawIssue);
    let statusName = "Ready";
    let priorityName;
    let areaName;
    for (let i = 0; i < rest.length; i += 2) {
      const flag = rest[i];
      const value = rest[i + 1];
      if (!value) throw new Error(`Missing value for ${flag}`);
      if (flag === "--status") statusName = value;
      else if (flag === "--priority") priorityName = value;
      else if (flag === "--area") areaName = value;
      else throw new Error(`Unknown option: ${flag}`);
    }
    return {
      command,
      issueNumber,
      statusName,
      statusOptionId: requireOptionId("status", statusName, "status"),
      priorityOptionId: priorityName
        ? requireOptionId("priority", priorityName, "priority")
        : undefined,
      areaOptionId: areaName
        ? requireOptionId("area", areaName, "area")
        : undefined,
    };
  }
  throw new Error(
    `Unknown command "${command ?? ""}". Use "add", "move", or "sync-event".`,
  );
}

export function resolveTransitionForEvent(eventName, payload) {
  const action = payload?.action;
  if (eventName === "issues") {
    if (action === "opened") return "Ready";
    if (action === "reopened") return "In Progress";
    if (action === "closed") return "Done";
    return null;
  }
  if (eventName === "pull_request" || eventName === "pull_request_target") {
    const pr = payload?.pull_request;
    if (action === "opened" || action === "reopened") {
      return pr?.draft ? "In Progress" : "In Review";
    }
    if (action === "ready_for_review") return "In Review";
    if (action === "converted_to_draft") return "In Progress";
    if (action === "closed") {
      return pr?.merged ? "Done" : "In Progress";
    }
    return null;
  }
  return null;
}

export function extractLinkedIssueNumbers(text = "", branchName = "") {
  const found = new Set();
  const keywordMatches = String(text).matchAll(
    /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi,
  );
  for (const match of keywordMatches) {
    found.add(Number.parseInt(match[1], 10));
  }
  if (found.size === 0 && branchName) {
    const branchMatch = String(branchName).match(
      /^(?:feat|fix|ops|chore)\/(\d+)-/i,
    );
    if (branchMatch) {
      found.add(Number.parseInt(branchMatch[1], 10));
    }
  }
  return [...found];
}

function ghGraphql(query, variables = {}) {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === "number") {
      args.push("-F", `${key}=${value}`);
    } else {
      args.push("-f", `${key}=${value}`);
    }
  }
  const stdout = execFileSync("gh", args, { encoding: "utf8" });
  return JSON.parse(stdout);
}

function ensureProjectItemId(issueNumber) {
  const lookup = ghGraphql(
    `query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          id
          projectItems(first: 20) {
            nodes {
              id
              project { id }
            }
          }
        }
      }
    }`,
    {
      owner: PROJECT_CONSTANTS.owner,
      repo: PROJECT_CONSTANTS.repo,
      number: issueNumber,
    },
  );
  const issue = lookup?.data?.repository?.issue;
  if (!issue?.id) {
    throw new Error(`Issue #${issueNumber} not found in ${PROJECT_CONSTANTS.owner}/${PROJECT_CONSTANTS.repo}`);
  }
  const existing = issue.projectItems?.nodes?.find(
    (node) => node.project?.id === PROJECT_CONSTANTS.projectId,
  );
  if (existing?.id) return existing.id;

  const added = ghGraphql(
    `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }`,
    {
      projectId: PROJECT_CONSTANTS.projectId,
      contentId: issue.id,
    },
  );
  const itemId = added?.data?.addProjectV2ItemById?.item?.id;
  if (!itemId) {
    throw new Error(`Failed to add Issue #${issueNumber} to Project #1`);
  }
  return itemId;
}

function setSingleSelectField(itemId, fieldId, optionId) {
  ghGraphql(
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }
      ) {
        projectV2Item { id }
      }
    }`,
    {
      projectId: PROJECT_CONSTANTS.projectId,
      itemId,
      fieldId,
      optionId,
    },
  );
}

function applyCommand(parsed) {
  if (parsed.command === "sync-event") {
    const eventName = process.env.GITHUB_EVENT_NAME ?? "";
    const eventPath = process.env.GITHUB_EVENT_PATH ?? "";
    if (!eventName || !eventPath) {
      throw new Error("GITHUB_EVENT_NAME and GITHUB_EVENT_PATH are required");
    }
    const payload = JSON.parse(readFileSync(eventPath, "utf8"));
    const nextStatus = resolveTransitionForEvent(eventName, payload);
    if (!nextStatus) {
      console.log(`No Kanban status transition for ${eventName}/${payload?.action}`);
      return;
    }
    const issueNumbers =
      eventName === "issues" && payload?.issue?.number
        ? [payload.issue.number]
        : extractLinkedIssueNumbers(
            payload?.pull_request?.body ?? "",
            payload?.pull_request?.head?.ref ?? "",
          );
    if (issueNumbers.length === 0) {
      console.log("No linked issue number found; skipping Kanban sync.");
      return;
    }
    const statusOptionId = requireOptionId("status", nextStatus, "status");
    for (const issueNumber of issueNumbers) {
      const itemId = ensureProjectItemId(issueNumber);
      setSingleSelectField(itemId, PROJECT_CONSTANTS.fields.status.id, statusOptionId);
      console.log(`Kanban #${issueNumber} -> ${nextStatus}`);
    }
    return;
  }

  const itemId = ensureProjectItemId(parsed.issueNumber);
  setSingleSelectField(
    itemId,
    PROJECT_CONSTANTS.fields.status.id,
    parsed.statusOptionId,
  );
  if (parsed.priorityOptionId) {
    setSingleSelectField(
      itemId,
      PROJECT_CONSTANTS.fields.priority.id,
      parsed.priorityOptionId,
    );
  }
  if (parsed.areaOptionId) {
    setSingleSelectField(
      itemId,
      PROJECT_CONSTANTS.fields.area.id,
      parsed.areaOptionId,
    );
  }
  console.log(`Kanban #${parsed.issueNumber} -> ${parsed.statusName}`);
}

const isEntrypoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  applyCommand(parseKanbanArgs(process.argv.slice(2)));
}
