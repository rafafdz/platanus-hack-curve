import { createFileRoute, Link } from "@tanstack/react-router";
import { queryClient } from "../../client";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authed/admin/")({
  loader: async () => {
    await queryClient.ensureQueryData(convexQuery(api.admin.events.list, {}));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: events } = useSuspenseQuery(convexQuery(api.admin.events.list, {}));

  return (
    <div className="p-2">
      <h3>Administración de eventos</h3>
      <Link to="/" className="underline">
        Volver a home
      </Link>
      <ul>
        {events?.map((event) => (
          <li key={event._id} className="flex gap-2">
            <div>{event.name}</div>
            <Link to="/admin/$id" className="underline" params={{ id: event._id }}>
              Administrar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
