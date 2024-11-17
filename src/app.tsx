import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { StrictMode, Suspense } from "react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { convex, queryClient } from "./client";
import { QueryClientProvider } from "@tanstack/react-query";
import bananaDance from "./assets/banana-dance.gif";
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function Loading() {
  return (
    <div>
      <img src={bananaDance} alt="loading" />
    </div>
  );
}

export function App() {
  return (
    <StrictMode>
      <Suspense fallback={<Loading />}>
        <QueryClientProvider client={queryClient}>
          <ConvexAuthProvider client={convex}>
            <RouterProvider router={router} />
          </ConvexAuthProvider>
        </QueryClientProvider>
      </Suspense>
    </StrictMode>
  );
}
