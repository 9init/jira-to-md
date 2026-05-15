chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "copyTicket") {
    handleExport().then(sendResponse).catch((err) => {
      showToast(err.message, "error");
      sendResponse({ error: err.message });
    });
    return true;
  }
});

async function handleExport() {
  const issueKey = extractIssueKey();
  if (!issueKey) {
    throw new Error("Could not detect Jira issue key from URL");
  }

  const baseUrl = window.location.origin;

  const response = await fetch(
    `${baseUrl}/rest/api/3/issue/${issueKey}?fields=description,summary,issuetype,status,priority,parent,assignee,reporter,created,updated&expand=renderedFields`,
    {
      credentials: "include",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ticket: ${response.status} ${response.statusText}`);
  }

  const issue = await response.json();
  const f = issue.fields;

  const renderedDescription =
    issue.renderedFields?.description || issue.fields?.description || "";

  if (!renderedDescription) {
    throw new Error("Ticket has no description");
  }

  const header = buildHeader(issue, f, baseUrl);
  const markdown = htmlToMarkdown(renderedDescription);

  await navigator.clipboard.writeText(header + "\n" + markdown);
  showToast("Copied to clipboard!", "success");
}

function extractIssueKey() {
  const match = window.location.pathname.match(/\/browse\/([A-Z][A-Z0-9_]+-\d+)/);
  return match ? match[1] : null;
}

function buildHeader(issue, f, baseUrl) {
  const lines = [`# ${issue.key}: ${f.summary || ""}`, ""];

  if (f.issuetype) lines.push(`**Type:** ${f.issuetype.name}`);
  if (f.status) lines.push(`**Status:** ${f.status.name}`);
  if (f.priority) lines.push(`**Priority:** ${f.priority.name}`);
  if (f.parent) lines.push(`**Parent:** ${f.parent.key}`);
  if (f.assignee) lines.push(`**Assignee:** ${f.assignee.displayName}`);
  if (f.reporter) lines.push(`**Reporter:** ${f.reporter.displayName}`);
  if (f.created) lines.push(`**Created:** ${f.created}`);
  if (f.updated) lines.push(`**Updated:** ${f.updated}`);

  lines.push(`**Link:** ${baseUrl}/browse/${issue.key}`);
  lines.push("");
  lines.push("---");

  return lines.join("\n");
}

function htmlToMarkdown(html) {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
  });

  td.escape = function (str) {
    return str;
  };

  td.addRule("ttInlineCode", {
    filter: ["tt", "code"],
    replacement: (content) => {
      if (!content.trim()) return "";
      return content.trim().includes("\n")
        ? content.trim()
        : "`" + content.trim() + "`";
    },
  });

  td.addRule("preCodeBlock", {
    filter: (node) =>
      node.nodeName === "PRE" &&
      (node.querySelector("code") || node.textContent.includes("\n")),
    replacement: (content, node) => {
      const codeEl = node.querySelector("code");
      const codeContent = codeEl
        ? codeEl.textContent
        : node.textContent.replace(/^\n+|\n+$/g, "");
      const lang =
        codeEl?.className?.replace(/language-/, "") ||
        node.className?.replace(/language-/, "") ||
        "";
      return `\n\`\`\`${lang}\n${codeContent}\n\`\`\`\n`;
    },
  });

  td.addRule("jiraTable", {
    filter: (node) =>
      node.nodeName === "TABLE" && node.classList.contains("confluenceTable"),
    replacement: (content, node) => {
      const rows = node.querySelectorAll("tr");
      if (!rows.length) return "";

      const parseRow = (row) => {
        const cells = row.querySelectorAll("th, td");
        return Array.from(cells).map((cell) =>
          cell.textContent.trim().replace(/\n/g, " ")
        );
      };

      const headerCells = parseRow(rows[0]);
      const isHeaderRow = rows[0].querySelector("th") !== null;

      const allRows = [];
      if (isHeaderRow) {
        allRows.push(headerCells);
        for (let i = 1; i < rows.length; i++) {
          allRows.push(parseRow(rows[i]));
        }
      } else {
        for (let i = 0; i < rows.length; i++) {
          allRows.push(parseRow(rows[i]));
        }
      }

      const colCount = Math.max(...allRows.map((r) => r.length));
      const pad = (cells) => {
        while (cells.length < colCount) cells.push("");
        return cells;
      };

      let result = "";
      const header = pad(allRows[0]);

      result += "| " + header.join(" | ") + " |\n";
      result += "|" + header.map(() => "---").join("|") + "|\n";

      const startIdx = isHeaderRow ? 1 : 0;
      for (let i = startIdx; i < allRows.length; i++) {
        const cells = pad(allRows[i]);
        result += "| " + cells.join(" | ") + " |\n";
      }

      return result.trim();
    },
  });

  td.addRule("stripAnchorWrappers", {
    filter: (node) =>
      node.nodeName === "A" &&
      node.getAttribute("href")?.startsWith("#") &&
      node.getAttribute("name") &&
      node.childNodes.length === 0,
    replacement: () => "",
  });

  td.addRule("unwrapDivs", {
    filter: (node) =>
      node.nodeName === "DIV" &&
      (node.classList.contains("table-wrap") ||
        node.classList.contains("content-wrapper")),
    replacement: (content) => content,
  });

  td.remove(["script", "style"]);

  let markdown = td.turndown(html);

  markdown = markdown.replace(/\n{3,}/g, "\n\n");
  markdown = markdown.replace(/^- {3}/gm, "- ");

  return markdown.trim();
}

function showToast(message, type) {
  const existing = document.getElementById("jira-md-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "jira-md-toast";
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    padding: "12px 20px",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: "999999",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    backgroundColor: type === "success" ? "#00875a" : "#de350b",
    transition: "opacity 0.3s",
  });

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
