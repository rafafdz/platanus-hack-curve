import { createFileRoute, Link } from "@tanstack/react-router";
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
    <div className="p-2 max-w-lg mx-auto flex flex-col h-full">
      <div className="grow flex flex-col">
        <h1 className="text-center mb-2">Hack</h1>
        <ul className="w-full max-w-sm mx-auto">
          {events?.map((event) => (
            <li key={event._id}>
              <Link
                to="/event/$slug"
                params={{ slug: event.slug }}
                className="block bg-base-900 p-4 border border-base-500 rounded-sm text-2xl text-center"
              >
                {event.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2 justify-center text-base-500">
        <Link className="underline" to="/new">
          Crear
        </Link>
        <Link className="underline" to="/admin">
          Admin
        </Link>
      </div>
    </div>
  );
}
