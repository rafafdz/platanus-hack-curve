import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { handleGitHubWebhook } from "./integrations/github";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  method: "POST",
  pathPrefix: "/integrations/github/webhook/",
  handler: handleGitHubWebhook,
});

export default http;
