import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
  args: {
    eventSlug: v.string(),
  },
  handler: async (ctx, { eventSlug }) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", eventSlug))
      .unique();

    if (!event) throw new ConvexError({ status: 404, message: "Event not found" });

    const pushEvents = await ctx.db
      .query("githubPushEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .order("desc")
      .take(30);

    return pushEvents;
  },
});
