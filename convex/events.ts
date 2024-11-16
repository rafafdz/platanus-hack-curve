import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
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
    if (!userId) throw new ConvexError("Not authenticated");
    if (/[^a-z0-9-]/.test(slug)) throw new ConvexError("Slug must be lowercase alphanumeric with dashes");

    const existingEvent = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existingEvent) throw new ConvexError("Event with this slug already exists");

    const eventId = await ctx.db.insert("events", {
      name,
      slug,
      endsAt,
      isPublic: false,
    });
    await ctx.db.insert("eventAdmins", { eventId, userId });
  },
});
