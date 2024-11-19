import { createFileRoute } from "@tanstack/react-router";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { queryClient } from "../../client";
import { Button } from "../../components/admin/button";
import { FormEvent, useState } from "react";
import { Input, Label } from "../../components/admin/forms";

export const Route = createFileRoute("/_authed/admin/$id/teams")({
  loader: async ({ params: { id } }) => {
    await queryClient.ensureQueryData(convexQuery(api.admin.teams.list, { eventId: id }));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data: teams } = useSuspenseQuery(convexQuery(api.admin.teams.list, { eventId: id }));

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [members, setMembers] = useState<string[]>(["", "", ""]);

  const createTeam = useConvexMutation(api.admin.teams.create);
  const createTeamMutation = useMutation({
    mutationFn: async (event: FormEvent) => {
      event.preventDefault();
      await createTeam({ eventId: id, team: { name, url, members: members.map((githubUser) => ({ githubUser })) } });
    },
  });

  return (
    <div>
      <h2 className="font-bold">Equipos</h2>

      <hr className="my-4 border-base-500" />

      <form onSubmit={createTeamMutation.mutate}>
        <div>
          <Label htmlFor="new-team">Nombre</Label>{" "}
          <Input id="new-team" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-url">URL</Label>{" "}
          <Input id="new-url" type="url://" required value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          {members.map((member, index) => (
            <div key={index}>
              <Label htmlFor={`new-member-${index}`}>Miembro {index + 1}</Label>{" "}
              <Input
                id={`new-member-${index}`}
                type="text"
                required
                value={member}
                onChange={(e) => setMembers([...members.slice(0, index), e.target.value, ...members.slice(index + 1)])}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" onClick={() => setMembers([...members, ""])}>
              Agregar miembro
            </Button>
            <Button type="button" onClick={() => setMembers(members.slice(0, members.length - 1))}>
              Eliminar miembro
            </Button>
          </div>
        </div>
        <Button type="submit">Crear</Button>
      </form>

      <hr className="my-4 border-base-500" />

      <ul className="flex flex-col gap-2">
        {teams.map((team) => (
          <li key={team._id} className="bg-base-900">
            <div className="flex justify-between">
              <div className="font-bold">
                {team.name} - {team.url}
              </div>
              <Button
                variant="danger"
                // onClick={() => deleteAnnouncementMutation.mutate(announcement._id)}
                // disabled={deleteAnnouncementMutation.isPending}
              >
                Eliminar
              </Button>
            </div>
            {team.members.map((member) => (
              <div key={member.githubUser}>- {member.githubUser}</div>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
