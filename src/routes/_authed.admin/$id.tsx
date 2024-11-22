import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { queryClient } from "../../client";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuthActions } from "@convex-dev/auth/react";

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
  const { data: version } = useSuspenseQuery(convexQuery(api.version.current, {}));
  const { signOut } = useAuthActions();
  const navigate = Route.useNavigate();
  return (
    <div className="max-w-5xl w-full mx-auto py-2 select-none">
      <div className="flex justify-between gap-2 items-center">
        <div>
          <h1 className="text-2xl font-bold text-base-200">{event.name}</h1>
        </div>
        <div className="text-base-500 flex gap-2">
          <button onClick={() => signOut().then(() => navigate({ to: "/" }))} className="underline hover:text-base-600">
            Cerrar sesión
          </button>
          <div>Versión app: {version}</div>
        </div>
      </div>

      <div className="flex justify-between gap-2">
        <div className="flex gap-2">
          <Link
            from={Route.fullPath}
            to="/admin/$id"
            activeOptions={{ exact: true }}
            activeProps={{
              className: "underline text-base-100 cursor-default",
            }}
            inactiveProps={{
              className: "underline text-base-400 hover:text-base-200 cursor-default",
            }}
          >
            Configuración
          </Link>
          <Link
            from={Route.fullPath}
            to="/admin/$id/activities"
            activeProps={{
              className: "underline text-base-100 cursor-default",
            }}
            inactiveProps={{
              className: "underline text-base-400 hover:text-base-200 cursor-default",
            }}
          >
            Actividades
          </Link>
          <Link
            from={Route.fullPath}
            to="/admin/$id/announcements"
            activeProps={{
              className: "underline text-base-100 cursor-default",
            }}
            inactiveProps={{
              className: "underline text-base-400 hover:text-base-200 cursor-default",
            }}
          >
            Anuncios
          </Link>
          <Link
            from={Route.fullPath}
            to="/admin/$id/teams"
            activeProps={{
              className: "underline text-base-100 cursor-default",
            }}
            inactiveProps={{
              className: "underline text-base-400 hover:text-base-200 cursor-default",
            }}
          >
            Equipos
          </Link>
        </div>
        <div>
          <Link
            to="/event/$slug"
            params={{ slug: event.slug }}
            activeProps={{
              className: "underline text-base-100 cursor-default",
            }}
            inactiveProps={{
              className: "underline text-base-400 hover:text-base-200 cursor-default",
            }}
          >
            Ver pantalla
          </Link>
        </div>
      </div>
      <hr className="my-4 border-base-500" />
      <Outlet />
    </div>
  );
}
