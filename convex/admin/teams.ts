import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { assertEventAuthorization } from "./events";

export const create = mutation({
  args: {
    eventId: v.id("events"),
    team: v.object({
      name: v.string(),
      url: v.string(),
      members: v.array(
        v.object({
          githubUser: v.string(),
        })
      ),
    }),
  },
  handler: async (ctx, { eventId, team }) => {
    await assertEventAuthorization(ctx, eventId);
    return ctx.db.insert("teams", { eventId, ...team });
  },
});

const _delete = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, { teamId }) => {
    const team = await ctx.db.get(teamId);
    if (!team) throw new ConvexError({ code: 404, message: "Not found" });
    await assertEventAuthorization(ctx, team.eventId);
    return ctx.db.delete(teamId);
  },
});
export { _delete as delete };

export const list = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, { eventId }) => {
    await assertEventAuthorization(ctx, eventId);
    return ctx.db
      .query("teams")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect();
  },
});
