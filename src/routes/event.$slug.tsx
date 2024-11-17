import { createFileRoute, ErrorComponentProps, Link } from "@tanstack/react-router";
import { queryClient } from "../client";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { act, useEffect, useMemo, useState } from "react";

import { RPlace } from "../components/rplace";
import { cva } from "cva";
import { FunctionReturnType } from "convex/server";

export const Route = createFileRoute("/event/$slug")({
  errorComponent: ErrorComponent,
  loader: async ({ params: { slug } }) => {
    return Promise.all([
      queryClient.ensureQueryData(convexQuery(api.events.getBySlug, { slug })),
      queryClient.ensureQueryData(convexQuery(api.activities.listByEventSlug, { eventSlug: slug })),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="grid grid-cols-[2fr_3fr] grid-rows-[1fr_min-content] h-full overflow-clip p-2 gap-2">
      <div className="row-span-2 flex flex-col justify-between">
        <div>
          <GoToAdmin />
        </div>
        <div className="flex flex-col gap-2">
          <Activities />
          <TimeLeft />
        </div>
      </div>
      <RPlace />
      <div>
        <PushEvents />
      </div>
    </div>
  );
}

function ErrorComponent(props: ErrorComponentProps) {
  if (props.error.status === 404) {
    return (
      <div>
        <h1>Event not found</h1>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Error</h1>
      <pre>{props.error.message}</pre>
    </div>
  );
}

function GoToAdmin() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(convexQuery(api.events.getBySlug, { slug }));
  const { isSuccess } = useQuery(convexQuery(api.admin.events.get, { id: event._id }));

  if (isSuccess) {
    return (
      <Link
        className="flex justify-center items-center bg-base-800 h-9 rounded-sm"
        to="/admin/$id"
        params={{ id: event._id }}
      >
        Ir a admin
      </Link>
    );
  }

  return null;
}

const activitiesStyles = cva({
  base: "bg-base-800 text-base-100 rounded-md p-2",
  variants: {
    state: {
      active: "text-primary-950 bg-primary-500",
      soon: "bg-base-800",
      default: "bg-base-900",
    },
  },
});

function Activities() {
  const { slug } = Route.useParams();
  const { data: activities } = useSuspenseQuery(convexQuery(api.activities.listByEventSlug, { eventSlug: slug }));

  return (
    <ul className="flex flex-col gap-2">
      {activities
        .filter((activity) => activity.endsAt > Date.now())
        .reverse()
        .map((activity) => (
          <li
            key={activity._id}
            className={activitiesStyles({
              state:
                activity.startsAt < Date.now()
                  ? "active"
                  : activity.startsAt - Date.now() < 1000 * 60 * 60
                    ? "soon"
                    : "default",
            })}
          >
            <div>
              <div className="font-bold text-2xl">{activity.name}</div>
              <div>
                {new Date(activity.startsAt).toLocaleString()} - {new Date(activity.endsAt).toLocaleString()}
              </div>
            </div>
          </li>
        ))}
    </ul>
  );
}

function formatTimeLeft(timeLeft: number) {
  const seconds = Math.floor(timeLeft / 1000);

  const hours = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");

  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");

  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}

function TimeLeft() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(convexQuery(api.events.getBySlug, { slug }));

  const [timeLeft, setTimeLeft] = useState(event.endsAt - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(event.endsAt - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [event.endsAt]);

  return (
    <div className="bg-base-900 flex justify-center flex-col items-center p-4 rounded-sm">
      {timeLeft < 0 ? (
        <>Ended</>
      ) : (
        <>
          <div className="text-base-500">Ends in</div>
          <div className="text-6xl">{formatTimeLeft(timeLeft)}</div>
        </>
      )}
    </div>
  );
}

function splitPushEvents<T>({ data, bins: count, by }: { data: T[]; bins: number; by: (item: T) => number }) {
  const bins: T[][] = [];
  for (let i = 0; i < count; i++) {
    bins.push([]);
  }

  for (const item of data) {
    bins[by(item) % count].push(item);
  }

  return bins;
}

function PushEvents() {
  const { slug } = Route.useParams();
  const { data: pushEvents } = useSuspenseQuery(convexQuery(api.githubPushEvents.list, { eventSlug: slug }));

  const binned = useMemo(
    () =>
      splitPushEvents({
        data: pushEvents,
        bins: 4,
        by: (event) => event.timestamp,
      }),
    [pushEvents]
  );

  return (
    <div className="flex flex-col h-full w-full flex-nowra justify-between gap-2 relative">
      {binned.map((bin, i) => (
        <div key={i} className="flex flex-row gap-2 h-full overflow-clip w-max">
          {bin.map((pushEvent) => (
            <PushEvent pushEvent={pushEvent} key={pushEvent._id} />
          ))}
        </div>
      ))}
      {/* fade */}
      <div className="absolute inset-y-0 right-0 -mr-8 w-24 bg-gradient-to-l from-base-900 to-transparent" />
    </div>
  );
}

function PushEvent({ pushEvent }: { pushEvent: FunctionReturnType<typeof api.githubPushEvents.list>[number] }) {
  return (
    <div className="p-[1px] rounded-sm simple-gradient" style={{ "--simple-gradient-hue": pushEvent.timestamp % 360 }}>
      <div className="inline-flex gap-2 items-center p-2 bg-base-900/95 h-full rounded-sm">
        <img
          src={`https://github.com/${pushEvent.author}.png`}
          alt={pushEvent.author}
          className="w-6 h-6 rounded-full shrink-0"
        />
        <span className="text-base-200 shrink-0">{pushEvent.author}</span>
        <span className="text-base-400 font-light shrink-0">pushed</span>
        <span className="text-base-200 line-clamp-1 text-ellipsis max-w-64">{pushEvent.message}</span>
        <span className="text-base-400 font-light shrink-0">to</span>
        <span className="text-base-200 shrink-0">{pushEvent.repoName}</span>
      </div>
    </div>
  );
}

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}
