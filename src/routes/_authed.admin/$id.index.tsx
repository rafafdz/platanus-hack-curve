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

const siteHttpUrl = import.meta.env.VITE_CONVEX_URL.replace(".convex.cloud", ".convex.site");

export const Route = createFileRoute("/_authed/admin/$id/")({
  loader: async ({ params: { id } }) => {
    await Promise.all([
      queryClient.ensureQueryData(convexQuery(api.admin.events.get, { id })),
      queryClient.ensureQueryData(convexQuery(api.admin.github.getConfig, { id })),
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
    </>
  );
}

function GeneralConfig() {
  const { id } = Route.useParams();
  const { data: config } = useSuspenseQuery(convexQuery(api.admin.events.get, { id }));
  const [name, setName] = useState(config?.name);
  const [endsAt, setEndsAt] = useState(new Date(config?.endsAt).toISOString().slice(0, 16));
  const [iframe, setIframe] = useState(config?.iframe);
  const [activity, setCurrentActivity] = useState(config?.currentActivity);

  const update = useConvexMutation(api.admin.events.patch);

  const updateMutation = useMutation({
    mutationFn: async (event: FormEvent) => {
      event.preventDefault();
      await update({ id, event: { name, endsAt: new Date(endsAt).getTime() } });
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
          <Input id="new-iframe" type="url" value={config?.iframe} onChange={(e) => setIframe(e.target.value)} />
        </div>
        <div>
          <legend>Actividad Actual</legend>
          <RadioGroup.Root value={activity} onValueChange={(value) => setCurrentActivity(value as "place" | "iframe")}>
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
          </RadioGroup.Root>
        </div>
        <Button type="submit">Guardar</Button>
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
            <Button variant="danger" className="ml-2" onClick={() => resetMutation.mutate({ id })}>
              Reiniciar
            </Button>
          </div>
        </>
      ) : (
        <Button onClick={() => resetMutation.mutate({ id })}>Activar</Button>
      )}
    </>
  );
}
