import type {
  Project,
  FullProject,
  Note,
  Tag,
  SearchResult,
  PaginatedProjects,
  ProjectStatus,
  Priority,
  NoteType,
} from "../types/index.js";

export class BacklogClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) url += `?${qs}`;
    }

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  // Projects
  async listProjects(filters?: {
    status?: ProjectStatus;
    priority?: Priority;
    tag?: string;
    limit?: number;
  }): Promise<PaginatedProjects> {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.priority) params.priority = filters.priority;
    if (filters?.tag) params.tag = filters.tag;
    if (filters?.limit) params.limit = String(filters.limit);
    return this.request<PaginatedProjects>("GET", "/projects", undefined, params);
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>("GET", `/projects/${id}`);
  }

  async getProjectFull(id: string): Promise<FullProject> {
    return this.request<FullProject>("GET", `/projects/${id}/full`);
  }

  async createProject(data: {
    title: string;
    description?: string;
    status?: ProjectStatus;
    priority?: Priority;
    repoUrl?: string;
    deployUrl?: string;
    blogUrl?: string;
    tags?: string[];
  }): Promise<Project> {
    return this.request<Project>("POST", "/projects", data);
  }

  async deleteProject(id: string, hard = false): Promise<void> {
    return this.request<void>("DELETE", `/projects/${id}`, undefined, hard ? { hard: "true" } : undefined);
  }

  async updateProject(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: ProjectStatus;
      priority?: Priority;
      repoUrl?: string;
      deployUrl?: string;
      blogUrl?: string;
      addTags?: string[];
      removeTags?: string[];
    }
  ): Promise<Project> {
    return this.request<Project>("PATCH", `/projects/${id}`, data);
  }

  // Notes
  async addNote(
    projectId: string,
    data: {
      content: string;
      type?: NoteType;
      source?: string;
    }
  ): Promise<Note> {
    return this.request<Note>("POST", `/projects/${projectId}/notes`, data);
  }

  async editNote(
    noteId: string,
    data: { content: string; type?: NoteType }
  ): Promise<Note> {
    return this.request<Note>("PATCH", `/notes/${noteId}`, data);
  }

  // Tags
  async listTags(): Promise<Tag[]> {
    return this.request<Tag[]>("GET", "/tags");
  }

  async createTag(name: string, color?: string): Promise<Tag> {
    return this.request<Tag>("POST", "/tags", { name, color });
  }

  // Search
  async search(
    query: string,
    type: "projects" | "notes" | "all" = "all",
    limit = 10,
    noteType?: string
  ): Promise<{ results: SearchResult[]; query: string }> {
    const params: Record<string, string> = { q: query, type, limit: String(limit) };
    if (noteType) params.noteType = noteType;
    return this.request<{ results: SearchResult[]; query: string }>(
      "GET",
      "/search",
      undefined,
      params
    );
  }

  /**
   * Fuzzy match a project by title.
   * Priority: exact → case-insensitive → substring.
   */
  async findProjectByTitle(title: string): Promise<Project | null> {
    const { projects } = await this.listProjects({ limit: 100 });
    const lower = title.toLowerCase();

    return (
      projects.find((p) => p.title === title) ??
      projects.find((p) => p.title.toLowerCase() === lower) ??
      projects.find(
        (p) =>
          p.title.toLowerCase().includes(lower) ||
          lower.includes(p.title.toLowerCase())
      ) ??
      null
    );
  }

  /**
   * Resolve a full project ID from an exact ID or a short prefix.
   * First tries a direct GET (fast path for correct full IDs).
   * If that fails, lists all projects (including archived) and finds
   * the first one whose ID starts with the given prefix.
   */
  async resolveProjectId(idOrPrefix: string): Promise<string | null> {
    // Fast path: try exact lookup
    try {
      const project = await this.getProject(idOrPrefix);
      return project.id;
    } catch {
      // Fall back to prefix search across normal + archived projects
      const [normal, archived] = await Promise.all([
        this.listProjects({ limit: 200 }),
        this.listProjects({ status: "ARCHIVED", limit: 200 }),
      ]);
      const all = [...normal.projects, ...archived.projects];
      const found = all.find((p) => p.id.startsWith(idOrPrefix));
      return found?.id ?? null;
    }
  }
}
