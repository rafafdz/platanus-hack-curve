import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";

export const getCurrentByEventSlug = query({
  args: { eventSlug: v.string() },
  handler: async (ctx, { eventSlug }) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", eventSlug))
      .unique();
    if (!event) throw new ConvexError({ status: 404, message: "Event not found" });

    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .collect();

    return announcements;
  },
});
