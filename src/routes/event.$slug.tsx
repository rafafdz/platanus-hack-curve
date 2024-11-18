import { createFileRoute, ErrorComponentProps, Link } from "@tanstack/react-router";
import { queryClient } from "../client";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Marquee from "react-fast-marquee";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import * as RadioGroup from "@radix-ui/react-radio-group";

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
    <div className="grid grid-cols-[2fr_5fr] grid-rows-[1fr_min-content] h-full overflow-clip p-2 gap-2">
      <div className="flex flex-col justify-between">
        <div className="flex flex-col gap-2">
          <GoToAdmin />
        </div>
        <div className="flex flex-col gap-2">
          <Activities />
        </div>
      </div>
      <div className="row-start-2 flex flex-col gap-2 h-full">
        <div className="bg-base-900 flex justify-center items-center h-11">Música actual</div>
        <TimeLeft />
        <CurrentUrl />
      </div>
      <Suspense fallback={<PlaceLoading />}>
        <Place />
      </Suspense>
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <div className="w-48 shrink-0 bg-base-900 rounded-sm flex justify-center items-center">Equipo actual</div>
          <PushEvents />
        </div>
        <Announcement />
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

function CurrentUrl() {
  const { slug } = Route.useParams();
  const url = new URL(window.location.href);
  return (
    <div className="text-center text-sm">
      <span className="text-base-50">{url.host}</span>
      <span className="text-base-300">/event/</span>
      <span className="text-primary-500">{slug}</span>
    </div>
  );
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

function ActivityDateTime({ startsAt, endsAt }: { startsAt: number; endsAt: number }) {
  const startFormatter = Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
  });

  const endFormatter = Intl.DateTimeFormat("es-CL", {
    weekday: endsAt - startsAt > 1000 * 60 * 60 * 24 ? "long" : undefined,
    hour: "numeric",
    minute: "numeric",
  });

  return (
    <>
      {startFormatter.format(new Date(startsAt))} - {endFormatter.format(new Date(endsAt))}
    </>
  );
}

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
                <ActivityDateTime startsAt={activity.startsAt} endsAt={activity.endsAt} />
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
    <div className="bg-base-900 flex justify-center flex-col items-center p-2 rounded-sm leading-none">
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
        bins: 5,
        by: (event) => event.timestamp,
      }),
    [pushEvents]
  );

  return (
    <div className="flex flex-col justify-between gap-1 relative min-w-full">
      {binned.map((bin, i) => (
        <div key={i} className="flex flex-row gap-1 overflow-clip w-max h-7">
          {bin.map((pushEvent) => (
            <PushEvent pushEvent={pushEvent} key={pushEvent._id} />
          ))}
        </div>
      ))}
      <div className="absolute inset-y-0 right-0 -mr-8 w-24 bg-gradient-to-l from-base-900 to-transparent" />
    </div>
  );
}

function PushEvent({ pushEvent }: { pushEvent: FunctionReturnType<typeof api.githubPushEvents.list>[number] }) {
  return (
    <div className="p-[1px] rounded-sm simple-gradient" style={{ "--simple-gradient-hue": pushEvent.timestamp % 360 }}>
      <div className="inline-flex gap-2 items-center px-2 bg-base-900/95 h-full rounded-xs text-sm">
        <img
          src={`https://github.com/${pushEvent.author}.png`}
          alt={pushEvent.author}
          className="w-4 h-4 shrink-0 rounded-xs"
        />
        <span className="text-base-200 shrink-0">{pushEvent.author}</span>
        <span className="text-base-300/75 font-light shrink-0">pushed</span>
        <span className="text-base-200 line-clamp-1 text-ellipsis max-w-64">{pushEvent.message}</span>
        <span className="text-base-300/75 font-light shrink-0">to</span>
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

function Announcement() {
  const { slug } = Route.useParams();
  const { data: announcements } = useSuspenseQuery(
    convexQuery(api.announcements.getCurrentByEventSlug, { eventSlug: slug })
  );

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const current = announcements.find(
    (announcement) => announcement.startsAt <= currentTime && currentTime < announcement.endsAt
  );

  if (!current) return null;

  return (
    <Marquee pauseOnHover autoFill speed={40} className="leading-tight">
      <div className="mr-8">{current.content}</div>
    </Marquee>
  );
}

function PlaceLoading() {
  return (
    <div className="bg-base-300 text-base-900  items-center justify-center rounded-sm flex flex-col">Cargando</div>
  );
}
function Place() {
  const { slug } = Route.useParams();
  const {
    data: { nextPlacementAfter },
  } = useSuspenseQuery(convexQuery(api.place.getLastPlacedCommitBySelf, { eventSlug: slug }));

  const { data: place } = useSuspenseQuery(convexQuery(api.place.get, { eventSlug: slug }));

  const [selectedColor, setSelectedColor] = useState(place.colorOptions[0]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const handleResize = useCallback(() => {
    if (!containerRef.current) return;

    const { width, height } = containerRef.current.getBoundingClientRect();
    setContainerSize({ width, height });
  }, []);

  useLayoutEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const scale = useMemo(() => {
    if (!containerSize.width || !containerSize.height) return 1;

    const scale = Math.min(containerSize.width / place.colors[0].length, containerSize.height / place.colors.length);
    console.log(scale);
    return scale;
  }, [containerSize, place.colors]);

  const colorPixel = useConvexMutation(api.place.updateColor);

  const colorPixelMutation = useMutation({
    mutationFn: async ({ x, y }: { x: number; y: number }) => {
      await colorPixel({
        eventId: place.eventId,
        cell: { x, y, color: selectedColor },
      });
    },
  });

  console.log(nextPlacementAfter);
  // https://github.com/BetterTyped/react-zoom-pan-pinch/blob/master/src/stories/examples/image-responsive/example.tsx
  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      <div className="flex justify-between">
        <div>
          <RadioGroup.Root
            value={selectedColor}
            onValueChange={(value) => setSelectedColor(value)}
            className="flex gap-2 mx-1"
          >
            {place.colorOptions.map((color, i) => (
              <RadioGroup.Item
                value={color}
                key={i}
                className="inline-block aspect-square h-4 rounded-full data-[state=checked]:outline-2 outline-offset-1"
                style={{ backgroundColor: color }}
              ></RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </div>
        <div>
          <TimeToWait time={nextPlacementAfter} />
        </div>
      </div>
      <div ref={containerRef} className="h-full">
        <TransformWrapper
          centerOnInit
          key={`${containerSize.width}x${containerSize.height}`}
          initialScale={scale}
          minScale={scale * 0.9}
          maxScale={scale * 4}
          wheel={{ smoothStep: 0.05 }}
          pinch={{ step: 10 }}
        >
          <TransformComponent wrapperClass="bg-base-800 rounded" wrapperStyle={{ width: "100%", height: "100%" }}>
            <svg
              viewBox={`0 0 ${place.colors[0].length} ${place.colors.length}`}
              width={place.colors[0].length}
              height={place.colors.length}
              shape-rendering="crispEdges"
            >
              {place.colors.map((colorsRow, y) => (
                <g key={y}>
                  {colorsRow.map((color, x) => (
                    <rect
                      x={x}
                      y={y}
                      width={1}
                      height={1}
                      fill={color}
                      key={`${x}-${y}`}
                      className="hover:outline hover:outline-base-700 hover:z-10"
                      onClick={() => colorPixelMutation.mutate({ x, y })}
                    />
                  ))}
                </g>
              ))}
            </svg>
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
}

function TimeToWait({ time }: { time: number }) {
  const [timeLeft, setTimeLeft] = useState(time);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(time - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [time]);

  if (timeLeft <= 0) return null;

  return <div className="text-base-400 text-center">Next color in {formatTimeLeft(timeLeft)}</div>;
}
