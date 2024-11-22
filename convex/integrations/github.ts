import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { ActionCtx, httpAction, internalMutation, internalQuery, query } from "../_generated/server";
import { Webhooks, emitterEventNames } from "@octokit/webhooks";
import { v } from "convex/values";

class WebhookHandler {
  private webhooks: Webhooks;
  constructor(ctx: ActionCtx, eventId: Id<"events">, secret: string) {
    console.log("Creating webhook handler", { eventId, secret });

    this.webhooks = new Webhooks({ secret });
    this.webhooks.on("push", async (event) => {
      const lastCommit = event.payload.commits.at(-1)!;
      const message = lastCommit.message;
      const author = event.payload.pusher.username || event.payload.sender?.login || "Unknown";
      const timestamp = new Date(lastCommit.timestamp).getTime();
      const repoName = event.payload.repository.name;
      const branch = event.payload.ref.replace("refs/heads/", "");
      const pushEvent = { repoName, author, message, timestamp, branch };
      await ctx.runMutation(internal.integrations.github.addGitHubPushEvent, { eventId, pushEvent });
    });

    this.webhooks.on("ping", async (event) => {
      console.log("Ping event received");
    });
  }

  async handleRequest(request: Request) {
    const id = request.headers.get("X-GitHub-Delivery");
    const signature = request.headers.get("X-Hub-Signature-256");
    const name = request.headers.get("X-GitHub-Event") as any; // weas mal hechas de GitHub
    const contentType = request.headers.get("Content-Type");

    if (!id || !signature || !name || contentType !== "application/json") {
      return new Response("Invalid request", { status: 400 });
    }

    try {
      const payload = await request.text();
      console.log("Received webhook", { id, name, payload, signature });
      await this.webhooks.verifyAndReceive({ id, name, payload, signature });
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error(error);
      return new Response("Error", { status: 500 });
    }
  }
}

// /integrations/github/webhook/{eventId}
export const handleGitHubWebhook = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const path = url.pathname;
  const eventId = path.split("/").at(-1);
  if (!eventId) return new Response("Invalid request", { status: 400 });

  const config = await ctx.runQuery(internal.integrations.github.getGitHubPushEventConfig, {
    eventId: eventId as Id<"events">,
  });

  if (!config) return new Response("Config not found", { status: 404 });

  const handler = new WebhookHandler(ctx, config.eventId, config.secret);
  return handler.handleRequest(request);
});

export const addGitHubPushEvent = internalMutation({
  args: {
    eventId: v.id("events"),
    pushEvent: v.object({
      repoName: v.string(),
      author: v.string(),
      message: v.string(),
      timestamp: v.number(),
      branch: v.string(),
    }),
  },
  handler: async (ctx, { eventId, pushEvent }) => {
    await ctx.db.insert("githubPushEvents", { ...pushEvent, eventId });
  },
});

export const getGitHubPushEventConfig = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    return ctx.db
      .query("githubWebhookConfigs")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();
  },
});
