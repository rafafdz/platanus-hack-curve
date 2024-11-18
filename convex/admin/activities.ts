import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { assertEventAuthorization } from "./events";

export const create = mutation({
  args: {
    eventId: v.id("events"),
    activity: v.object({
      endsAt: v.number(),
      name: v.string(),
      startsAt: v.number(),
    }),
  },
  handler: async (ctx, { eventId, activity }) => {
    await assertEventAuthorization(ctx, eventId);
    if (activity.endsAt < activity.startsAt) {
      throw new ConvexError({ code: 400, message: "EndsAt must be after StartsAt" });
    }
    if (activity.name.trim().length === 0) {
      throw new ConvexError({ code: 400, message: "Name must not be empty" });
    }
    return ctx.db.insert("activities", { ...activity, eventId });
  },
});

const _delete = mutation({
  args: { activityId: v.id("activities") },
  handler: async (ctx, { activityId }) => {
    const activity = await ctx.db.get(activityId);
    if (!activity) throw new ConvexError({ code: 404, message: "Not found" });
    await assertEventAuthorization(ctx, activity.eventId);
    return ctx.db.delete(activityId);
  },
});
export { _delete as delete };
