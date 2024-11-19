import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { assertEventAuthorization } from "./events";

export const getConnection = query({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await assertEventAuthorization(ctx, id);

    const connection = await ctx.db
      .query("spotifyConnections")
      .withIndex("by_eventId", (q) => q.eq("eventId", id))
      .unique();

    const state = await ctx.db
      .query("spotifyState")
      .withIndex("by_eventId", (q) => q.eq("eventId", id))
      .unique();

    if (!connection) return null;

    const scheduled = await ctx.db.system.get(connection.scheduledUpdateState);

    return {
      ...connection,
      state,
      scheduledRefresh: scheduled,
    };
  },
});

export const deleteConnection = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await assertEventAuthorization(ctx, id);

    const connection = await ctx.db
      .query("spotifyConnections")
      .withIndex("by_eventId", (q) => q.eq("eventId", id))
      .unique();

    const state = await ctx.db
      .query("spotifyState")
      .withIndex("by_eventId", (q) => q.eq("eventId", id))
      .unique();

    if (state) {
      await ctx.db.delete(state._id);
    }
    if (connection) {
      await ctx.scheduler.cancel(connection.scheduledUpdateState);
      await ctx.db.delete(connection._id);
    }
  },
});
