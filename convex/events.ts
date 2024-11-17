import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
  },
  handler: async (ctx, { name, slug, endsAt }) => {
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
      isPublic: process.env.DEFAULT_EVENT_VISIBILITY === "public",
    });
    await ctx.db.insert("eventAdmins", { eventId, userId });
  },
});
