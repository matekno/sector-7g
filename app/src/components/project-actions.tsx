"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectActionsProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    repoUrl: string | null;
    deployUrl: string | null;
    blogUrl: string | null;
  };
}

export function ProjectActions({ project }: ProjectActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: project.title,
    description: project.description ?? "",
    status: project.status,
    priority: project.priority,
    repoUrl: project.repoUrl ?? "",
    deployUrl: project.deployUrl ?? "",
    blogUrl: project.blogUrl ?? "",
  });

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          status: form.status,
          priority: form.priority,
          repoUrl: form.repoUrl || null,
          deployUrl: form.deployUrl || null,
          blogUrl: form.blogUrl || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(hard: boolean) {
    setDeleting(true);
    setError(null);
    try {
      const url = hard
        ? `/api/projects/${project.id}?hard=true`
        : `/api/projects/${project.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.push("/projects");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error deleting");
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>

      {/* Edit modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDEA">💡 Idea</SelectItem>
                    <SelectItem value="PLANNED">📋 Planned</SelectItem>
                    <SelectItem value="IN_PROGRESS">🚧 In Progress</SelectItem>
                    <SelectItem value="PAUSED">⏸ Paused</SelectItem>
                    <SelectItem value="DONE">✅ Done</SelectItem>
                    <SelectItem value="ARCHIVED">📦 Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="repoUrl">Repo URL</Label>
              <Input
                id="repoUrl"
                placeholder="https://github.com/..."
                value={form.repoUrl}
                onChange={(e) => setForm({ ...form, repoUrl: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="deployUrl">Deploy URL</Label>
              <Input
                id="deployUrl"
                placeholder="https://..."
                value={form.deployUrl}
                onChange={(e) => setForm({ ...form, deployUrl: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="blogUrl">Blog URL</Label>
              <Input
                id="blogUrl"
                placeholder="https://..."
                value={form.blogUrl}
                onChange={(e) => setForm({ ...form, blogUrl: e.target.value })}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{project.title}&rdquo;?</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            <strong>Archive</strong> moves it to the archived list (recoverable).{" "}
            <strong>Delete permanently</strong> removes it and all its notes forever.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() => handleDelete(false)}
              disabled={deleting}
            >
              {deleting ? "Archiving..." : "Archive"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(true)}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
