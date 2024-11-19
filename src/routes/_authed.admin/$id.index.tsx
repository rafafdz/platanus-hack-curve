import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Input, Label } from "../../components/admin/forms";
import { FormEvent, useState } from "react";
import { Button } from "../../components/admin/button";
import { Copiable } from "../../components/admin/copiable";
import { queryClient } from "../../client";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Id } from "../../../convex/_generated/dataModel";

const siteHttpUrl = import.meta.env.VITE_CONVEX_URL.replace(".convex.cloud", ".convex.site");

export const Route = createFileRoute("/_authed/admin/$id/")({
  loader: async ({ params: { id } }) => {
    await Promise.all([
      queryClient.ensureQueryData(convexQuery(api.admin.events.get, { id })),
      queryClient.ensureQueryData(convexQuery(api.admin.github.getConfig, { id })),
      queryClient.ensureQueryData(convexQuery(api.admin.spotify.getConnection, { id })),
      queryClient.ensureQueryData(convexQuery(api.admin.teams.list, { eventId: id })),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <h2 className="font-bold">Configuración General</h2>
      <GeneralConfig />
      <hr className="my-4 border-base-500" />
      <h2 className="font-bold">GitHub</h2>
      <GitHubConfig />
      <hr className="my-4 border-base-500" />
      <h2 className="font-bold">Spotify</h2>
      <SpotifyConfig />
    </>
  );
}

function GeneralConfig() {
  const { id } = Route.useParams();
  const { data: config } = useSuspenseQuery(convexQuery(api.admin.events.get, { id }));
  const { data: teams } = useSuspenseQuery(convexQuery(api.admin.teams.list, { eventId: id }));

  const [name, setName] = useState(config?.name);
  const [endsAt, setEndsAt] = useState(new Date(config?.endsAt).toISOString().slice(0, 16));
  const [iframe, setIframe] = useState(config?.iframe);
  const [activity, setCurrentActivity] = useState(config?.currentActivity);
  const [fullscreen, setFullscreen] = useState(config?.fullScreenActivity);
  const [team, setTeam] = useState(teams.at(0)?._id);

  const update = useConvexMutation(api.admin.events.patch);

  const updateMutation = useMutation({
    mutationFn: async (event: FormEvent) => {
      event.preventDefault();
      await update({
        id,
        event: {
          name,
          endsAt: new Date(endsAt).getTime(),
          currentActivity: activity,
          iframe,
          fullScreenActivity: fullscreen,
          teamToShowId: team,
        },
      });
    },
  });

  return (
    <>
      <form onSubmit={updateMutation.mutate}>
        <div>
          <Label htmlFor="new-name">Nombre:</Label>{" "}
          <Input id="new-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-endsAt">Fecha de termino:</Label>{" "}
          <Input
            id="new-endsAt"
            required
            pattern="[a-z0-9-]+"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="new-iframe">Iframe de cuadro (optional):</Label>{" "}
          <Input
            id="new-iframe"
            className="w-full"
            type="url"
            value={iframe}
            onChange={(e) => setIframe(e.target.value)}
          />
        </div>
        <div>
          <legend>Equipo que se mostrará</legend>
          <RadioGroup.Root value={team} onValueChange={(value) => setTeam(value as Id<"teams">)}>
            {teams.map((team) => (
              <RadioGroup.Item key={team._id} value={team._id} className="block">
                <span className="data-[state=checked]:bg-base-800 inline-block w-2 mr-2 bg-base-700">
                  <RadioGroup.Indicator>×</RadioGroup.Indicator>
                </span>
                {team.name}
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </div>
        <div>
          <legend>Actividad Actual</legend>
          <RadioGroup.Root
            value={activity}
            onValueChange={(value) => setCurrentActivity(value as "place" | "iframe" | "teams")}
          >
            <RadioGroup.Item value="place" className="block">
              <span className="data-[state=checked]:bg-base-800 inline-block w-2 mr-2 bg-base-700">
                <RadioGroup.Indicator>×</RadioGroup.Indicator>
              </span>
              r/place
            </RadioGroup.Item>
            <RadioGroup.Item value="iframe" className="block">
              <span className="data-[state=checked]:bg-base-800 inline-block w-2 mr-2 bg-base-700">
                <RadioGroup.Indicator>×</RadioGroup.Indicator>
              </span>
              Iframe
            </RadioGroup.Item>
            <RadioGroup.Item value="teams" className="block">
              <span className="data-[state=checked]:bg-base-800 inline-block w-2 mr-2 bg-base-700">
                <RadioGroup.Indicator>×</RadioGroup.Indicator>
              </span>
              Equipos
            </RadioGroup.Item>
          </RadioGroup.Root>
        </div>
        <div>
          <Label htmlFor="new-fullscreen">Dejarlo en pantalla completa:</Label>{" "}
          <input
            type="checkbox"
            id="new-fullscreen"
            checked={fullscreen}
            onChange={(e) => setFullscreen(e.target.checked)}
          />
        </div>
        <Button type="submit" disabled={updateMutation.isPending}>
          Guardar
        </Button>
        {updateMutation.isError && <div className="text-red-600">Error: {updateMutation.error.message}</div>}
        {updateMutation.isSuccess && <div className="text-green-600">Guardado</div>}
      </form>
    </>
  );
}

function GitHubConfig() {
  const { id } = Route.useParams();
  const { data: config } = useSuspenseQuery(convexQuery(api.admin.github.getConfig, { id }));

  const resetMutation = useMutation({
    mutationFn: useConvexMutation(api.admin.github.resetConfig),
  });

  return (
    <>
      {config ? (
        <>
          <div>
            URL: <Copiable text={`${siteHttpUrl}/integrations/github/webhook/${id}`} />
          </div>
          <div>
            Secret: <Copiable text={config.secret} />
            <Button
              variant="danger"
              className="ml-2"
              disabled={resetMutation.isPending}
              onClick={() => resetMutation.mutate({ id })}
            >
              Reiniciar
            </Button>
          </div>
        </>
      ) : (
        <Button disabled={resetMutation.isPending} onClick={() => resetMutation.mutate({ id })}>
          Activar
        </Button>
      )}
    </>
  );
}

function SpotifyConfig() {
  const { id } = Route.useParams();
  const { data: connection } = useSuspenseQuery(convexQuery(api.admin.spotify.getConnection, { id }));
  const url = new URL(siteHttpUrl);
  url.pathname = "/integrations/spotify/auth";
  url.searchParams.set("eventId", id);

  const deleteConnection = useConvexMutation(api.admin.spotify.deleteConnection);
  const deleteConnectionMutation = useMutation({
    mutationFn: async () => {
      await deleteConnection({ id });
    },
  });

  if (!connection) {
    return (
      <a href={url.toString()} className="bg-base-200 text-base-900 hover:bg-base-100 px-4 leading-tight">
        Autentificar
      </a>
    );
  }

  return (
    <div>
      {/* {JSON.stringify(connection)} */}
      <div>
        <div>Conectado como {connection.name}</div>
        <div>
          {connection.scheduledRefresh?.state.kind === "failed" ? (
            <div className="text-red-600">
              Hubo un error al actualizar el estado:{" "}
              <span className="text-red-800">{connection.scheduledRefresh.state.error}</span>
            </div>
          ) : (
            <div className="text-base-300">
              Se actualizará el {new Date(connection.scheduledRefresh?.scheduledTime!).toLocaleString()}
            </div>
          )}
        </div>
        <div>
          {connection?.state?.track ? (
            <div>
              Reproduciendo: {connection.state.track.name}de {connection.state.track.artist}
            </div>
          ) : (
            <div>No hay música reproduciendo</div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="danger"
          disabled={deleteConnectionMutation.isPending}
          onClick={() => deleteConnectionMutation.mutate()}
        >
          Desconectar
        </Button>
        <a href={url.toString()} className="bg-red-700 text-red-50 hover:bg-red-600 px-4 leading-tight">
          Re-conectar
        </a>
      </div>
    </div>
  );
}
