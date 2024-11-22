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
    .withIndex("by_eventId_userId", (q) => q.eq("eventId", eventId).eq("userId", userId))
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
      iframe: v.optional(v.string()),
      currentActivity: v.union(
        v.literal("iframe"),
        v.literal("place"),
        v.literal("teams"),
        v.literal("🍌🪩"),
        v.literal("off")
      ),
      fullScreenActivity: v.optional(v.boolean()),
      teamToShowId: v.optional(v.id("teams")),
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

export const listAdmins = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    await assertEventAuthorization(ctx, eventId);

    const eventAdmins = await ctx.db
      .query("eventAdmins")
      .withIndex("by_eventId_userId", (q) => q.eq("eventId", eventId))
      .collect();

    const users = await Promise.all([
      ...eventAdmins.map(async (ea) => {
        const user = await ctx.db.get(ea.userId);
        if (!user) throw new ConvexError({ code: 500, message: "Invalid state" });
        return user;
      }),
    ]);

    return users;
  },
});

export const addAdmin = mutation({
  args: { eventId: v.id("events"), userId: v.id("users") },
  handler: async (ctx, { eventId, userId }) => {
    await assertEventAuthorization(ctx, eventId);
    const eventAdmin = await ctx.db
      .query("eventAdmins")
      .withIndex("by_eventId_userId", (q) => q.eq("eventId", eventId).eq("userId", userId))
      .unique();

    if (eventAdmin) throw new ConvexError({ code: 400, message: "User is already an admin" });

    await ctx.db.insert("eventAdmins", { eventId, userId });
  },
});

export const removeAdmin = mutation({
  args: { eventId: v.id("events"), userId: v.id("users") },
  handler: async (ctx, { eventId, userId }) => {
    await assertEventAuthorization(ctx, eventId);

    const admins = await ctx.db
      .query("eventAdmins")
      .withIndex("by_eventId_userId", (q) => q.eq("eventId", eventId))
      .collect();

    let adminId = null;
    for (const admin of admins) {
      if (admin.userId === userId) {
        adminId = admin._id;
        break;
      }
    }

    if (!adminId) throw new ConvexError({ code: 404, message: "Admin not found" });
    if (admins.length === 1) throw new ConvexError({ code: 400, message: "Cannot remove the last admin" });

    await ctx.db.delete(adminId);
  },
});
