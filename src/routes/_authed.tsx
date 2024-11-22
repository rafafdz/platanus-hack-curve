import { useAuthActions } from "@convex-dev/auth/react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { Loading } from "../loading";

export const Route = createFileRoute("/_authed")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();

  if (!isAuthenticated) {
    signIn("github", { redirectTo: window.location.pathname });
    return <Loading />;
  }

  return <Outlet />;
}
