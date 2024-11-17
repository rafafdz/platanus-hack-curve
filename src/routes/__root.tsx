import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { lazy, useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";

export const Route = createRootRoute({
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
