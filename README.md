# jira-md

Chrome/Edge extension that copies Jira ticket descriptions to clipboard as Markdown.

## Install

1. Clone or download this repo
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode**
4. Click **Load unpacked** → select the repo folder

## Usage

1. Open any Jira ticket (`/browse/PROJECT-123`)
2. Click the extension icon
3. The ticket header + description is copied to clipboard as Markdown

## Output format

```markdown
# PROJECT-123: Ticket Summary

**Type:** Story
**Status:** In Progress
**Priority:** High
**Assignee:** Jane Doe
**Reporter:** John Smith
**Created:** 2025-01-15T10:30:00.000+0000
**Updated:** 2025-01-16T14:20:00.000+0000
**Link:** https://your-domain.atlassian.net/browse/PROJECT-123

---

## Description content...
```

## How it works

- Fetches the ticket via Jira REST API (`/rest/api/3/issue/{key}?expand=renderedFields`)
- Converts rendered HTML to Markdown using [Turndown.js](https://github.com/mixmark-io/turndown)
- Copies to clipboard with a toast notification

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Access the current tab on icon click |
| `clipboardWrite` | Copy markdown to clipboard |
| `*://*.atlassian.net/*` | Fetch ticket data from Jira |
