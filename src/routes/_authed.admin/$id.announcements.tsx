import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { FormEvent, useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { Input, Label } from "../../components/admin/forms";
import { Button } from "../../components/admin/button";
import { queryClient } from "../../client";

export const Route = createFileRoute("/_authed/admin/$id/announcements")({
  loader: async ({ params: { id } }) => {
    await queryClient.ensureQueryData(convexQuery(api.admin.announcements.list, { eventId: id }));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data: announcements } = useSuspenseQuery(convexQuery(api.admin.announcements.list, { eventId: id }));

  const [content, setContent] = useState("");
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 16));
  const [to, setTo] = useState(new Date(Date.now() + 1000 * 60 * 30).toISOString().slice(0, 16));

  const createAnnouncement = useConvexMutation(api.admin.announcements.create);
  const createAnnouncementMutation = useMutation({
    mutationFn: async (event: FormEvent) => {
      event.preventDefault();
      const startsAt = new Date(from).getTime();
      const endsAt = new Date(to).getTime();
      if (isNaN(startsAt) || isNaN(endsAt)) {
        throw new Error("Invalid dates");
      }
      await createAnnouncement({ eventId: id, announcement: { content, startsAt, endsAt } });
    },
  });

  const deleteAnnouncement = useConvexMutation(api.admin.announcements.delete);
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (announcementId: Id<"announcements">) => {
      await deleteAnnouncement({ announcementId });
    },
  });

  console.log({ from, to });

  return (
    <div>
      <h2 className="font-bold">Anuncios</h2>
      <form onSubmit={createAnnouncementMutation.mutate}>
        <div>
          <Label htmlFor="new-announcement">Contenido</Label>
          <Input id="new-announcement" required value={content} onChange={(e) => setContent(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-from">Desde</Label>
          <Input id="new-from" required type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-to">Hasta</Label>
          <Input id="new-to" required type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="submit">Crear</Button>
      </form>
      <hr className="my-4 border-base-500" />

      <ul className="flex flex-col gap-2">
        {announcements.map((announcement) => (
          <li key={announcement._id} className="bg-base-900 rounded-sm">
            <div className="flex justify-between">
              <div className="font-bold">{announcement.content}</div>
              <Button
                variant="danger"
                onClick={() => deleteAnnouncementMutation.mutate(announcement._id)}
                disabled={deleteAnnouncementMutation.isPending}
              >
                Eliminar
              </Button>
            </div>

            <div>
              {new Date(announcement.startsAt).toLocaleString()} a {new Date(announcement.endsAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
