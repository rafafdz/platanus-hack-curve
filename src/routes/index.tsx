import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { queryClient } from "../client";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  loader: () => {
    queryClient.ensureQueryData(convexQuery(api.events.list, {}));
  },
  component: HomeComponent,
});

function HomeComponent() {
  const { data: events } = useSuspenseQuery(convexQuery(api.events.list, {}));

  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <ul>
        {events?.map((event) => (
          <li key={event._id}>
            <Link to="/event/$slug" params={{ slug: event.slug }}>
              {event.name}
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Link className="px-2 h-9 flex justify-center items-center bg-gray-700 rounded" to="/new">
          Crear
        </Link>
        <Link className="px-2 h-9 flex justify-center items-center bg-gray-700 rounded" to="/admin">
          Admin
        </Link>
      </div>
    </div>
  );
}
