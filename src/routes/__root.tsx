import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { lazy, useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import bananaDance from "../assets/banana-dance.gif";

function Loading() {
  return (
    <div className="flex justify-center items-center h-full images-are-pixelated">
      <img src={bananaDance} alt="loading" />
    </div>
  );
}

export const Route = createRootRoute({
  wrapInSuspense: true,
  pendingComponent: Loading,
  component: RootComponent,
});

const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : lazy(() =>
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
        }))
      );

function RootComponent() {
  const { data: version } = useSuspenseQuery(convexQuery(api.version.current, {}));
  const initialVersion = useRef(version);

  useEffect(() => {
    if (initialVersion.current !== version) {
      window.location.reload();
    }
  }, [version]);

  return (
    <>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
