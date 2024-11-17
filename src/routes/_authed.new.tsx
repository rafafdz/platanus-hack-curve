import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { Input } from "../components/admin/forms";
import { api } from "../../convex/_generated/api";
import { FormEvent, useState } from "react";
import { Button } from "../components/admin/button";

export const Route = createFileRoute("/_authed/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const navigate = useNavigate({ from: Route.fullPath });

  const create = useConvexMutation(api.events.create);
  const createMutation = useMutation({
    mutationFn: async (event: FormEvent) => {
      event.preventDefault();
      await create({ name, slug, endsAt: new Date(endsAt).getTime() });
    },
    onSuccess: async () => {
      await navigate({ to: "/" });
    },
  });

  return (
    <div className="flex justify-center items-center h-full">
      <form onSubmit={createMutation.mutate} className="bg-base-900 border border-base-500 px-2 py-4 rounded-sm">
        <div>
          <label htmlFor="new-name">Nombre</label>
          <Input id="new-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="new-slug">Slug</label>
          <Input id="new-slug" required pattern="[a-z0-9-]+" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div>
          <label htmlFor="new-endsAt">Hora de termino</label>
          <Input
            id="new-endsAt"
            required
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={createMutation.isPending}>
          Crear
        </Button>
        {createMutation.isError && <div>Error: {createMutation.error.message}</div>}
      </form>
    </div>
  );
}
