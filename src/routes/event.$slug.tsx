import { createFileRoute, ErrorComponentProps, Link } from "@tanstack/react-router";
import { queryClient } from "../client";
import { convexQuery, useConvexAuth, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useMutation, useQuery, useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Marquee from "react-fast-marquee";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { motion } from "motion/react";
import { cva } from "cva";
import { FunctionReturnType } from "convex/server";
import { useAuthActions } from "@convex-dev/auth/react";

export const Route = createFileRoute("/event/$slug")({
  errorComponent: ErrorComponent,
  loader: async ({ params: { slug } }) => {
    return Promise.all([
      queryClient.ensureQueryData(convexQuery(api.events.getBySlug, { slug })),
      queryClient.ensureQueryData(convexQuery(api.activities.listByEventSlug, { eventSlug: slug })),
      queryClient.ensureQueryData(convexQuery(api.githubPushEvents.list, { eventSlug: slug })),
      queryClient.ensureQueryData(convexQuery(api.announcements.getCurrentByEventSlug, { eventSlug: slug })),
      queryClient.ensureQueryData(convexQuery(api.spotify.currentTrack, { eventSlug: slug })),
    ]);
  },
  component: RouteComponent,
});

const hiddenOnFullScreenStyles = cva({
  base: "",
  variants: {
    fullscreen: {
      true: "sm:hidden",
      false: "",
    },
  },
  defaultVariants: {
    fullscreen: false,
  },
});

const gridStyles = cva({
  base: "grid h-full overflow-clip p-2 gap-2",
  variants: {
    fullscreen: {
      true: "",
      false: "sm:grid-cols-[1fr_3fr] sm:grid-rows-[1fr_min-content_min-content]",
    },
  },
  defaultVariants: {
    fullscreen: false,
  },
});

const activityContainerStyles = cva({
  base: "sm:h-full w-ful h-36",
  variants: {
    fullscreen: {
      true: "",
      false: "row-start-2 sm:row-start-auto",
    },
  },
  defaultVariants: {
    fullscreen: false,
  },
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(convexQuery(api.events.getBySlug, { slug }));
  const fullscreen = event.fullScreenActivity;

  return (
    <motion.div className={gridStyles({ fullscreen })}>
      <motion.div
        className={hiddenOnFullScreenStyles({ fullscreen, className: "flex flex-col justify-between gap-2" })}
      >
        <div className="sm:flex flex-col gap-2 shrink-0">
          <GoToAdmin />
        </div>
        <div className="flex flex-col gap-2">
          <Activities />
        </div>
      </motion.div>

      <motion.div
        className={hiddenOnFullScreenStyles({
          fullscreen,
          className: "sm:row-start-2 flex flex-col gap-2 h-full row-start-1 sm:row-auto",
        })}
      >
        <CurrentSong />
        <TimeLeft />
      </motion.div>

      <motion.div layout className={activityContainerStyles({ fullscreen })}>
        <DisplayActivity />
      </motion.div>

      <motion.div className={hiddenOnFullScreenStyles({ fullscreen, className: "flex flex-col gap-1" })}>
        <PushEvents />
      </motion.div>

      <motion.div className={hiddenOnFullScreenStyles({ fullscreen, className: "sm:col-span-2" })}>
        <AnnouncementOrURL />
      </motion.div>
    </motion.div>
  );
}

function ErrorComponent(props: ErrorComponentProps) {
  // @ts-ignore
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
  base: "bg-base-800 text-base-100 rounded-md p-2 shrink-0",
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
    <ul className="flex flex-col-reverse overflow-y-auto gap-2 h-min">
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

function CurrentSong() {
  const { slug } = Route.useParams();
  const { data: track } = useSuspenseQuery(convexQuery(api.spotify.currentTrack, { eventSlug: slug }));

  if (!track) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring" }}
      exit={{ y: 100 }}
      className="flex gap-2 items-center bg-base-900 rounded-sm p-2 -z-10"
    >
      <img src={track.image} alt={track.name} className="w-12 h-12 rounded-md shrink-0" />
      <div className="flex flex-col  leading-none">
        <div className="font-bold text-xl leading-tight text-base-200 line-clamp-1">{track.name}</div>
        <div className="text-base-300 text-ellipsis line-clamp-1">{track.artist}</div>
        {track.addedBy === null ? null : (
          <div className="text-base-400 text-ellipsis text-sm line-clamp-1">añadido por {track.addedBy}</div>
        )}
      </div>
    </motion.div>
  );
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
    <div className="bg-base-900 flex justify-center flex-col items-center p-2 rounded-sm leading-none grow">
      {timeLeft < 0 ? (
        <>Ended</>
      ) : (
        <>
          <div className="text-base-400">Ends in</div>
          <div className="text-6xl">{formatTimeLeft(timeLeft)}</div>
        </>
      )}
    </div>
  );
}

function DisplayActivity() {
  const { slug } = Route.useParams();
  const { data: event } = useSuspenseQuery(convexQuery(api.events.getBySlug, { slug }));
  const { data: team } = useSuspenseQuery(convexQuery(api.teams.getCurrent, { eventSlug: slug }));

  if (event.iframe && event.currentActivity === "iframe") {
    return (
      <iframe
        src={event.iframe}
        className="bg-base-900 rounded-sm w-full h-full"
        allow="autoplay;fullscreen;encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
    );
  }

  if (team && event.currentActivity === "teams") {
    return <Team team={team} />;
  }

  if (event.currentActivity === "🍌🪩") {
    return <div className="bananadance" />;
  }

  return (
    <Suspense fallback={<PlaceLoading />}>
      <Place />
    </Suspense>
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
        by: (event) => Math.round(event.timestamp / 10000) * event._id.charCodeAt(event._id.length - 1),
      }),
    [pushEvents]
  );

  return (
    <div className="flex flex-col justify-between gap-1 relative min-w-full">
      {binned.map((bin, i) => (
        <motion.div key={i} className="flex flex-row gap-1 overflow-clip w-max h-7">
          {bin.map((pushEvent) => (
            <PushEvent pushEvent={pushEvent} key={pushEvent._id} />
          ))}
        </motion.div>
      ))}
      <div className="absolute inset-y-0 right-0 -mr-8 w-24 bg-gradient-to-l from-base-900 to-transparent" />
    </div>
  );
}

function PushEvent({ pushEvent }: { pushEvent: FunctionReturnType<typeof api.githubPushEvents.list>[number] }) {
  return (
    <motion.div
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      transition={{ type: "spring" }}
      exit={{ opacity: 0 }}
      className="p-[1px] rounded-sm simple-gradient"
      style={{ "--simple-gradient-hue": pushEvent.timestamp % 360 }}
    >
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
    </motion.div>
  );
}

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

function AnnouncementOrURL() {
  const { slug } = Route.useParams();
  const { data: announcements } = useSuspenseQuery(
    convexQuery(api.announcements.getCurrentByEventSlug, { eventSlug: slug })
  );
  const url = new URL(window.location.href);

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

  if (!current)
    return (
      <div className="text-center text-sm">
        <span className="text-base-50">{url.host}</span>
        <span className="text-base-300">/event/</span>
        <span className="text-primary-500">{slug}</span>
      </div>
    );

  return (
    <Marquee pauseOnHover autoFill speed={40} className="leading-tight">
      <div className="mr-8">{current.content}</div>
    </Marquee>
  );
}

function PlaceLoading() {
  return (
    <div className="bg-base-700 text-base-900  items-center justify-center rounded-sm flex flex-col h-full">
      Cargando
    </div>
  );
}

function Place() {
  const { slug } = Route.useParams();
  const { data: commit } = useSuspenseQuery(convexQuery(api.place.getLastPlacedCommitBySelf, { eventSlug: slug }));
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const { data: place } = useSuspenseQuery(convexQuery(api.place.get, { eventSlug: slug }));

  const pixelQueries = useMemo(() => {
    const queries = [];
    for (let y = 0; y < place.height; y++) {
      queries.push(convexQuery(api.place.getPixelRow, { eventSlug: slug, y }));
    }
    return queries;
  }, [place.height, place.width, slug]);

  const pixelsRows = useSuspenseQueries({ queries: pixelQueries });

  const colorPixel = useConvexMutation(api.place.updateColor).withOptimisticUpdate((store, { cell }) => {
    const row = store.getQuery(api.place.getPixelRow, { eventSlug: slug, y: cell.y });
    if (!row) return;
    if (commit?.nextPlacementAfter && commit.nextPlacementAfter > Date.now()) {
      alert(`Espera por ${formatTimeLeft(commit.nextPlacementAfter - Date.now())}`);
      return;
    }
    row.colors[cell.x] = cell.color;
    store.setQuery(api.place.getPixelRow, { eventSlug: slug, y: cell.y }, row);
  });

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
  }, []);

  const scale = useMemo(() => {
    if (!containerSize.width || !containerSize.height) return 1;
    const scale = Math.min(containerSize.width / place.width, containerSize.height / place.height);
    return scale;
  }, [containerSize, place.width, place.height]);

  const colorPixelMutation = useMutation({
    mutationFn: async ({ x, y }: { x: number; y: number }) => {
      if (!isAuthenticated) return await signIn("github", { redirectTo: window.location.href });
      await colorPixel({ eventId: place.eventId, cell: { x, y, color: selectedColor } });
    },
  });

  // https://github.com/BetterTyped/react-zoom-pan-pinch/blob/master/src/stories/examples/image-responsive/example.tsx
  return (
    <div className="flex flex-col gap-2 h-full" ref={containerRef}>
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
        <div>{commit ? <TimeToWait time={commit.nextPlacementAfter} /> : null}</div>
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
              viewBox={`0 0 ${place.width} ${place.height}`}
              width={place.width}
              height={place.height}
              shapeRendering="crispEdges"
              style={{ color: selectedColor }}
            >
              <Pixels pixelsRows={pixelsRows} mutate={colorPixelMutation.mutate} />
            </svg>
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
}

function Pixels({
  pixelsRows,
  mutate,
}: {
  pixelsRows: Array<{ data: { colors: Array<string> } }>;
  mutate: ({ x, y }: { x: number; y: number }) => void;
}) {
  return pixelsRows.map((colorsRow, y) => (
    <g key={y}>
      {colorsRow.data.colors.map((color, x) => (
        <rect
          x={x}
          y={y}
          width={1}
          height={1}
          fill={color}
          key={`${x}-${y}`}
          onMouseEnter={
            // move to top
            (event) => {
              event.currentTarget.setAttribute("stroke", "currentColor");
              event.currentTarget.setAttribute("stroke-width", "0.2");
            }
          }
          onMouseLeave={(event) => {
            event.currentTarget.removeAttribute("stroke");
            event.currentTarget.removeAttribute("stroke-width");
          }}
          onClick={() => mutate({ x, y })}
        />
      ))}
    </g>
  ));
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
import { renderSVG } from "uqr";
function QR({ value, className }: { value: string; className?: string }) {
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!divRef.current) return;
    const svg = renderSVG(value, { whiteColor: "transparent", blackColor: "currentColor" });
    divRef.current.innerHTML = svg;
  }, [value]);

  return <div ref={divRef} className={className} />;
}
function Team({ team }: { team: { name: string; url: string; members: { githubUser: string }[] } }) {
  return (
    <div className="flex gap-12 items-center justify-center h-full">
      <div>
        <QR value={team.url} className="size-48" />
      </div>
      <div className="flex flex-col justify-center">
        <div className="text-4xl mb-2">{team.name}</div>
        <ul className="flex flex-col gap-2">
          {team.members.map((member) => (
            <li key={member.githubUser} className="flex items-center gap-2">
              <img
                src={`https://github.com/${member.githubUser}.png`}
                alt={member.githubUser}
                className="w-8 h-8 rounded-xs"
              />
              {member.githubUser}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
