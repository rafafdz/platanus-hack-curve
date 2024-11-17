import { createFileRoute } from "@tanstack/react-router";
import { queryClient } from "../../client";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Input } from "../../components/admin/input";
import { FormEvent, useState } from "react";
import { Button } from "../../components/admin/button";
import { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/_authed/admin/$id/activities")({
  loader: async ({ params: { id } }) => {
    await queryClient.ensureQueryData(convexQuery(api.activities.listByEventId, { eventId: id }));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data: activities } = useSuspenseQuery(convexQuery(api.activities.listByEventId, { eventId: id }));
  const createActivity = useConvexMutation(api.admin.activities.create);

  const createActivityMutation = useMutation({
    mutationFn: async (event: FormEvent) => {
      event.preventDefault();
      const startsAt = new Date(startAt).getTime();
      const endsAt = new Date(endAt).getTime();
      if (isNaN(startsAt) || isNaN(endsAt)) {
        throw new Error("Invalid dates");
      }

      if (startsAt >= endsAt) {
        throw new Error("Start date must be before end date");
      }

      await createActivity({ eventId: id, activity: { name, startsAt, endsAt } });
    },
  });
  const deleteActivity = useConvexMutation(api.admin.activities.delete);
  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: Id<"activities">) => {
      await deleteActivity({ activityId });
    },
  });

  const [name, setName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  return (
    <div className="p-2">
      <h1 className="text-2xl">Activities</h1>
      <form onSubmit={createActivityMutation.mutate}>
        <div>
          <label htmlFor="new-activity">Name</label>
          <Input id="new-activity" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label htmlFor="new-startAt">Starts at</label>
          <Input
            id="new-startAt"
            type="datetime-local"
            required
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="new-endAt">Ends at</label>
          <Input
            id="new-endAt"
            type="datetime-local"
            required
            value={endAt === "" ? startAt : endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </div>

        <Button type="submit">Create</Button>

        {createActivityMutation.isError && <div>Error: {createActivityMutation.error.message}</div>}
      </form>
      <ul className="flex flex-col gap-2">
        {activities?.map((activity) => (
          <li key={activity._id} className="bg-base-900 rounded-sm">
            <div>{activity.name}</div>
            <div>{new Date(activity.startsAt).toLocaleString()}</div>
            <div>{new Date(activity.endsAt).toLocaleString()}</div>
            <button
              onClick={() => deleteActivityMutation.mutate(activity._id)}
              className="bg-red-500"
              disabled={deleteActivityMutation.isPending}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
