import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";

export const listByEventSlug = query({
  args: {
    eventSlug: v.string(),
  },
  handler: async (ctx, { eventSlug }) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", eventSlug))
      .unique();

    if (!event) throw new ConvexError({ status: 404, message: "Event not found" });

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .collect();

    return activities.sort((a, b) => a.startsAt - b.startsAt);
  },
});

export const listByEventId = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, { eventId }) => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();

    return activities.sort((a, b) => a.startsAt - b.startsAt);
  },
});
