import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { StrictMode, Suspense } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { convex, queryClient } from "./client";
import { QueryClientProvider } from "@tanstack/react-query";
import { useConvexAuth } from "convex/react";
import { Loading } from "./loading";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <StrictMode>
      <Suspense fallback={<Loading />}>
        <QueryClientProvider client={queryClient}>
          <ConvexAuthProvider client={convex}>
            <Core />
          </ConvexAuthProvider>
        </QueryClientProvider>
      </Suspense>
    </StrictMode>
  );
}

function Core() {
  const { isLoading } = useConvexAuth();
  return isLoading ? <Loading /> : <RouterProvider router={router} />;
}
