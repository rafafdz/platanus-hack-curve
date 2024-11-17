import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { checkEventAuthorization } from "./events";

export const create = mutation({
  args: {
    eventId: v.id("events"),
    announcement: v.object({
      content: v.string(),
      startsAt: v.number(),
      endsAt: v.number(),
    }),
  },
  handler: async (ctx, { eventId, announcement }) => {
    await checkEventAuthorization(ctx, eventId);
    return ctx.db.insert("announcements", { eventId, ...announcement });
  },
});

export const list = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, { eventId }) => {
    await checkEventAuthorization(ctx, eventId);
    return ctx.db
      .query("announcements")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();
  },
});

const _delete = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, { announcementId }) => {
    const announcement = await ctx.db.get(announcementId);
    if (!announcement) throw new ConvexError({ code: 404, message: "Not found" });
    await checkEventAuthorization(ctx, announcement.eventId);
    return ctx.db.delete(announcementId);
  },
});
export { _delete as delete };
