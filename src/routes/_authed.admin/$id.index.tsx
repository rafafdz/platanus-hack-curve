import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authed/admin/$id/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: version } = useSuspenseQuery(convexQuery(api.version.current, {}));

  return (
    <>
      <h1>Configuración General</h1>
      <div>Versión app: {version}</div>
      <hr />
      <GitHubConfig />
    </>
  );
}

const siteHttpUrl = import.meta.env.VITE_CONVEX_URL.replace(".convex.cloud", ".convex.site");

function GitHubConfig() {
  const { id } = Route.useParams();
  const { data: config } = useSuspenseQuery(convexQuery(api.admin.github.getConfig, { id }));

  const resetMutation = useMutation({
    mutationFn: useConvexMutation(api.admin.github.resetConfig),
  });

  return (
    <>
      <h2>GitHub</h2>
      {config ? (
        <>
          <div>
            URL:{" "}
            <code>
              {siteHttpUrl}/integrations/github/webhook/{id}
            </code>
          </div>
          <div>
            Secret: <code>{config.secret}</code>
          </div>
        </>
      ) : null}
      <button onClick={() => resetMutation.mutate({ id })}>{config ? "Reiniciar" : "Activar"}</button>
    </>
  );
}
