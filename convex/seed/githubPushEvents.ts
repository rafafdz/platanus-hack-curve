import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const run = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, { eventId }) => {
    for (let i = 0; i < 60; i++) {
      await ctx.db.insert("githubPushEvents", {
        author: "octocat",
        branch: "main",
        message: `Update README.md ${i}`,
        timestamp: Date.now() + 5000 * i + Math.round(Math.random() * 1000),
        repoName: "convex",
        eventId,
      });
    }
  },
});
