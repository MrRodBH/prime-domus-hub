import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminObterPost } from "@/lib/api/blog.functions";
import { PostForm } from "@/components/admin/PostForm";

export const Route = createFileRoute("/_authenticated/admin/blog/$id")({
  component: EditPost,
});

function EditPost() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "blog-post", id],
    queryFn: () => adminObterPost({ data: { id } }),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!data) return <p>Post não encontrado.</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Editar post</h1>
      <PostForm initial={data} />
    </div>
  );
}
