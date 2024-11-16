import { useAuthActions } from "@convex-dev/auth/react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";

export const Route = createFileRoute("/_authed")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  if (!isAuthenticated) {
    signIn("github", { redirectTo: window.location.pathname });
    return <div>Cargando...</div>;
  }

  return <Outlet />;
}
