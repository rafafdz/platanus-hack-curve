import * as React from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { queryClient } from "../../client";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/_authed/admin/$id")({
  params: {
    parse: (params) => ({ id: params.id as Id<"events"> }),
  },
  loader: async ({ params: { id } }) => {
    await queryClient.ensureQueryData(convexQuery(api.admin.events.get, { id }));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data: event } = useSuspenseQuery(convexQuery(api.admin.events.get, { id }));

  return (
    <>
      <h1>{event.name}</h1>
      <div className="flex gap-2">
        <Link
          from={Route.fullPath}
          to="/admin/$id"
          className="px-2 h-9 flex justify-center items-center bg-base-700 rounded-sm"
        >
          Configuración
        </Link>
        <Link
          from={Route.fullPath}
          to="/admin/$id/activities"
          className="px-2 h-9 flex justify-center items-center bg-base-700 rounded-sm"
        >
          Actividades
        </Link>
        <Link
          from={Route.fullPath}
          to="/admin/$id/announcements"
          className="px-2 h-9 flex justify-center items-center bg-base-700 rounded-sm"
        >
          Anuncios
        </Link>
        <Link
          from={Route.fullPath}
          to="/admin/$id/teams"
          className="px-2 h-9 flex justify-center items-center bg-base-700 rounded-sm"
        >
          Equipos
        </Link>
        <Link
          to="/event/$slug"
          params={{ slug: event.slug }}
          className="px-2 h-9 flex justify-center items-center bg-base-700 rounded-sm"
        >
          Ver pantalla
        </Link>
      </div>
      <Outlet />
    </>
  );
}
