import { createFileRoute } from "@tanstack/react-router";
import { PostForm } from "@/components/admin/PostForm";

export const Route = createFileRoute("/_authenticated/admin/blog/novo")({
  component: () => (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Novo post</h1>
      <PostForm />
    </div>
  ),
});
