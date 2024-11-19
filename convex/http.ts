import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { handleGitHubWebhook } from "./integrations/github";
import * as spotify from "./integrations/spotify";
const http = httpRouter();

auth.addHttpRoutes(http);
spotify.addHttpRoutes(http);

http.route({
  method: "POST",
  pathPrefix: "/integrations/github/webhook/",
  handler: handleGitHubWebhook,
});

export default http;
