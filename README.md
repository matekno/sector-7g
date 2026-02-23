# Sector 7G — Personal Backlog

> *A project management system built for the way developers actually think: with an AI by their side.*

---

## The Problem with Ideas

Ideas are cheap. Execution is hard. But there's a step before execution that most tools completely ignore: **the slow accumulation of context**.

Every developer carries a mental backlog — the side project half-started six months ago, the tool you wanted to build after reading that blog post, the architectural decision you made at 2am and now can't remember why. Notebooks, Notion pages, GitHub issues, sticky notes — they all solve part of the problem and create new ones.

The deeper issue isn't organization. It's **continuity of thought**. When you return to an old project, you don't just need a task list. You need the decisions you made, the plans you sketched, the brainstorms that led nowhere, the logs of what you tried. You need the full picture.

And increasingly, you need your AI assistant to have that picture too.

---

## What Is This

Sector 7G is a personal project backlog with two interfaces: a web UI for browsing and a **Model Context Protocol (MCP) server** that gives Claude (or any MCP-compatible AI) direct, structured access to your backlog.

This means you can ask Claude "what was I planning to build last month?" and get a real answer. You can say "add a decision note to my auth project — I'm going with JWTs" and it's persisted. Your AI assistant becomes a genuine collaborator on your ideas, not just a stateless chatbot that forgets everything between sessions.

Projects move through a lifecycle: **Idea → Planned → In Progress → Paused → Done**. Each project accumulates typed notes — plans, decisions, specs, brainstorms, logs, summaries — with full version history. Tags, priority levels, and links to repos, deployments, and blog posts round out the metadata.

---

## Why It Makes Sense Now

The shift happening in software development isn't just about writing code faster. It's about the entire cognitive workflow moving toward a human–AI collaboration model.

Most project management tools were designed for teams. They're optimized for visibility, accountability, and process. A solo developer or indie hacker doesn't need any of that. They need a system that:

1. **Gets out of the way** when they're in flow
2. **Holds context** so nothing is lost between sessions
3. **Works with AI** natively, not as an afterthought

MCP (Model Context Protocol) is the emerging standard for giving AI assistants structured access to external tools and data. By building the backlog as an MCP server from the start, every piece of context you store becomes directly queryable by Claude — not through a vague RAG search, but through precise, typed tool calls.

This is what "AI-native" actually means in practice: not a chatbot bolted onto existing software, but a data layer designed to be read and written by both humans and AI.

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│    Web UI           │     │    Claude / AI        │
│    (Next.js)        │     │    (via MCP client)   │
└────────┬────────────┘     └──────────┬───────────┘
         │                             │
         ▼                             ▼
┌─────────────────────────────────────────────────┐
│              REST API (Next.js routes)          │
│              Bearer token auth                  │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              PostgreSQL + Prisma                │
│  Projects · Notes · Tags · Files · Versions     │
└─────────────────────────────────────────────────┘
```

The MCP server is a thin layer that translates Claude's tool calls into REST requests. This means the web UI and the AI share the exact same data layer — no sync issues, no duplicated state, no eventual consistency headaches.

---

## Data Model

The schema is designed around **projects as containers of accumulated context**:

- **Projects** have status, priority, tags, and optional links (repo, deploy, blog)
- **Notes** are the core value store — typed as `PLAN`, `DECISION`, `SPEC`, `BRAINSTORM`, `LOG`, or `SUMMARY` — and every edit is versioned
- **Files** can be attached to projects or individual notes
- **Tags** are shared across projects for cross-cutting themes

Note typing isn't cosmetic. A `DECISION` note means "we considered alternatives and chose this path." A `LOG` note means "here's what happened on a given date." A `SPEC` note means "this is the contract." Typed notes make the backlog scannable at a glance and filterable by intent.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 · React 19 · TypeScript |
| Styling | Tailwind CSS 4 · Radix UI · shadcn/ui |
| API | Next.js Route Handlers |
| MCP Server | `@modelcontextprotocol/sdk` · stdio & SSE transports |
| ORM | Prisma |
| Database | PostgreSQL |
| Validation | Zod |

---

## MCP Tools

The MCP server exposes 10 tools to AI clients:

| Tool | What it does |
|---|---|
| `create_project` | Create a new project |
| `list_projects` | List projects with status/priority/tag filters |
| `get_project` | Get full project context — all notes, files, tags |
| `update_project` | Modify fields, status, priority, tags |
| `delete_project` | Archive or hard-delete a project |
| `add_note` | Add a typed note (accepts fuzzy project title matching) |
| `edit_note` | Edit a note (previous version is saved automatically) |
| `search` | Full-text search across projects and notes |
| `backlog_summary` | High-level overview by status |
| `upload_file` | Attach a file to a project or note |

---

## Setup

**Prerequisites:** Node.js 20+, PostgreSQL, pnpm (or npm)

```bash
# Clone and install
git clone <repo>
cd sector-7g-backlog-personal
npm install

# Configure
cp .env.example .env
# Edit .env with your DATABASE_URL and API_KEY

# Set up the database
cd app && npx prisma migrate deploy

# Run the web app
npm run dev

# Run the MCP server (stdio mode, for Claude Desktop)
npm run start --workspace=mcp-server
```

**MCP configuration for Claude Desktop (`claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "sector7g": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "BACKLOG_API_URL": "http://localhost:3000/api",
        "BACKLOG_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## Name

Sector 7G is a reference to the nuclear power plant sector where Homer Simpson works — the place where things happen slowly, accidentally, and somehow still keep running. It felt like the right name for a backlog of personal projects.

---

## License

MIT
