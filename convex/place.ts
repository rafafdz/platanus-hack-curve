import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internalMutation, mutation, MutationCtx, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { checkIfIsEventAdmin } from "./admin/events";

const millisecondsRateLimit = 1000 * 30;

type PlaceOptions = {
  width: number;
  height: number;
  colorOptions: string[];
  defaultColor: string;
};

export async function createPlace(
  ctx: MutationCtx,
  eventId: Id<"events">,
  { height, width, colorOptions, defaultColor }: PlaceOptions
) {
  if (height < 1 || width < 1) throw new ConvexError("Invalid dimensions");
  if (colorOptions.length === 0) throw new ConvexError("No color options provided");
  if (width * height > 6000) throw new ConvexError("Too many pixels");

  await ctx.db.insert("placeState", {
    eventId,
    colorOptions,
    colors: new Array(height).fill(0).map(() => new Array(width).fill(defaultColor)),
  });
}

function isValidRGB(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color);
}

export const createOrReset = internalMutation({
  args: {
    eventId: v.id("events"),
    place: v.object({
      defaultColor: v.string(),
      colorOptions: v.array(v.string()),
      width: v.number(),
      height: v.number(),
    }),
  },
  handler: async (ctx, { eventId, place }) => {
    const existingPlace = await ctx.db
      .query("placeState")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();

    if (!isValidRGB(place.defaultColor)) throw new ConvexError("Invalid default color");
    for (const color of place.colorOptions) {
      if (!isValidRGB(color)) throw new ConvexError("Invalid color option");
    }

    if (existingPlace) await ctx.db.delete(existingPlace._id);
    await createPlace(ctx, eventId, place);
  },
});

export const updateColor = mutation({
  args: {
    eventId: v.id("events"),
    cell: v.object({
      x: v.number(),
      y: v.number(),
      color: v.string(),
    }),
  },
  handler: async (ctx, { eventId, cell }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Unauthorized");

    const place = await ctx.db
      .query("placeState")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();

    if (!place) throw new ConvexError("Place not found");

    if (cell.x < 0 || cell.x >= place.colors[0].length || cell.y < 0 || cell.y >= place.colors.length) {
      throw new ConvexError("Out of bounds");
    }

    if (!place.colorOptions.some((c) => c === cell.color)) {
      throw new ConvexError("Invalid color");
    }

    const isEventAdmin = await checkIfIsEventAdmin(ctx, eventId);
    if (!isEventAdmin) {
      const lastCommit = await ctx.db
        .query("placeCommits")
        .withIndex("by_eventId_userId", (q) => q.eq("eventId", eventId).eq("userId", userId))
        .order("desc")
        .first();

      if (lastCommit && Date.now() - lastCommit._creationTime < millisecondsRateLimit) {
        throw new ConvexError({ code: 429, message: "Rate limited" });
      }
    }

    await ctx.db.insert("placeCommits", { eventId, userId, x: cell.x, y: cell.y, color: cell.color });
    place.colors[cell.y][cell.x] = cell.color;
    await ctx.db.patch(place._id, { colors: place.colors });
  },
});

export const get = query({
  args: { eventSlug: v.string() },
  handler: async (ctx, { eventSlug }) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", eventSlug))
      .unique();

    if (!event) throw new ConvexError({ code: 404, message: "Event not found" });

    const place = await ctx.db
      .query("placeState")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .unique();

    if (!place) throw new ConvexError({ code: 404, message: "Place not found" });

    return place;
  },
});

export const getLastPlacedCommitBySelf = query({
  args: { eventSlug: v.string() },
  handler: async (ctx, { eventSlug }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ code: 401, message: "Unauthorized" });

    const event = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", eventSlug))
      .unique();

    if (!event) throw new ConvexError({ code: 404, message: "Event not found" });

    const isEventAdmin = await checkIfIsEventAdmin(ctx, event._id);

    const lastCommit = await ctx.db
      .query("placeCommits")
      .withIndex("by_eventId_userId", (q) => q.eq("eventId", event._id).eq("userId", userId))
      .order("desc")
      .first();

    const nextPlacementAfter = !lastCommit || isEventAdmin ? 0 : lastCommit._creationTime + millisecondsRateLimit;

    return { lastCommit, isEventAdmin, nextPlacementAfter };
  },
});
