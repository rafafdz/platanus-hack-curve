import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { checkEventAuthorization } from "./events";

export const getConfig = query({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await checkEventAuthorization(ctx, id);

    const config = await ctx.db
      .query("githubWebhookConfigs")
      .withIndex("by_eventId", (q) => q.eq("eventId", id))
      .unique();

    return config;
  },
});

export const resetConfig = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await checkEventAuthorization(ctx, id);

    const config = await ctx.db
      .query("githubWebhookConfigs")
      .withIndex("by_eventId", (q) => q.eq("eventId", id))
      .unique();

    if (config) {
      ctx.db.delete(config._id);
    }

    await ctx.db.insert("githubWebhookConfigs", {
      eventId: id,
      secret: Math.random().toString(36).substring(2),
    });
  },
});
