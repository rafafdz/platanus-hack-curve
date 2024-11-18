import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";

export async function checkIfIsEventAdmin(ctx: QueryCtx, eventId: Id<"events">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;

  const eventAdmin = await ctx.db
    .query("eventAdmins")
    .withIndex("by_eventId_userId", (q) => q.eq("eventId", eventId).eq("userId", userId))
    .unique();

  return !!eventAdmin;
}

export async function assertEventAuthorization(ctx: QueryCtx | MutationCtx, eventId: Id<"events">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ code: 401, message: "Not authenticated" });

  const eventAdmin = await ctx.db
    .query("eventAdmins")
    .withIndex("by_userId_eventId", (q) => q.eq("eventId", eventId).eq("userId", userId))
    .unique();

  if (!eventAdmin) throw new ConvexError({ code: 403, message: "Not found" });
}

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ code: 401, message: "Not authenticated" });

    const eventAdmins = await ctx.db
      .query("eventAdmins")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const events = await Promise.all([
      ...eventAdmins.map(async (ea) => {
        const event = await ctx.db.get(ea.eventId);
        if (!event) throw new ConvexError({ code: 500, message: "Invalid state" });
        return event;
      }),
    ]);

    return events;
  },
});

export const get = query({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await assertEventAuthorization(ctx, id);
    const event = await ctx.db.get(id);
    if (!event) throw new ConvexError({ code: 404, message: "Not found" });
    return event;
  },
});

export const patch = mutation({
  args: {
    id: v.id("events"),
    event: v.object({
      name: v.string(),
      endsAt: v.number(),
    }),
  },
  handler: async (ctx, { id, event: eventData }) => {
    await assertEventAuthorization(ctx, id);
    return ctx.db.patch(id, eventData);
  },
});

const _delete = mutation({
  args: { id: v.id("events") },
  handler: async (ctx, { id }) => {
    await assertEventAuthorization(ctx, id);
    return ctx.db.delete(id);
  },
});
export { _delete as delete };
