import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createPlace } from "./place";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (!event) throw new ConvexError({ status: 404, message: "Event not found" });

    return event;
  },
});

export const list = query({
  handler: async (ctx) => {
    return ctx.db
      .query("events")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    endsAt: v.number(),
    place: v.object({
      defaultColor: v.string(),
      colorOptions: v.array(v.string()),
      width: v.number(),
      height: v.number(),
    }),
  },
  handler: async (ctx, { name, slug, endsAt, place }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ status: 401, message: "Unauthorized" });
    if (/[^a-z0-9-]/.test(slug)) throw new ConvexError({ status: 400, message: "Invalid slug" });

    const existingEvent = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existingEvent) throw new ConvexError({ status: 400, message: "Slug already in use" });

    const eventId = await ctx.db.insert("events", {
      name,
      slug,
      endsAt,
      currentActivity: "place",
      isPublic: process.env.DEFAULT_EVENT_VISIBILITY === "public",
    });
    await ctx.db.insert("eventAdmins", { eventId, userId });
    await createPlace(ctx, eventId, place);
  },
});

const _delete = internalMutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);

    const eventAdmins = await ctx.db
      .query("eventAdmins")
      .withIndex("by_eventId_userId", (q) => q.eq("eventId", id))
      .collect();

    for (const admin of eventAdmins) {
      await ctx.db.delete(admin._id);
    }

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_eventId", (q) => q.eq("eventId", id))
      .collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_eventId", (q) => q.eq("eventId", id))
      .collect();

    for (const announcement of announcements) {
      await ctx.db.delete(announcement._id);
    }

    const githubWebhookConfigs = await ctx.db
      .query("githubWebhookConfigs")
      .withIndex("by_eventId", (q) => q.eq("eventId", id))
      .collect();

    for (const config of githubWebhookConfigs) {
      await ctx.db.delete(config._id);
    }

    const githubPushEvents = await ctx.db
      .query("githubPushEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", id))
      .collect();

    for (const event of githubPushEvents) {
      await ctx.db.delete(event._id);
    }

    const placeState = await ctx.db
      .query("placeState")
      .withIndex("by_eventId", (q) => q.eq("eventId", id))
      .unique();

    if (placeState) {
      await ctx.db.delete(placeState._id);
    }

    const placeCommits = await ctx.db
      .query("placeCommits")
      .withIndex("by_eventId_userId", (q) => q.eq("eventId", id))
      .collect();

    for (const commit of placeCommits) {
      await ctx.db.delete(commit._id);
    }

    await ctx.db.delete(id);
  },
});

export { _delete as delete };
