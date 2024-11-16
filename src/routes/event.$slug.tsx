import { createFileRoute } from "@tanstack/react-router";
import { queryClient } from "../client";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/event/$slug")({
  loader: ({ params: { slug } }) => {
    queryClient.ensureQueryData(convexQuery(api.events.getBySlug, { slug }));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(convexQuery(api.events.getBySlug, { slug }));
  return JSON.stringify(event, null, 2);
}
