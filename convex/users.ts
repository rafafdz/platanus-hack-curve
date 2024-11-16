import { query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";

export const self = query({
  handler: async (ctx) => {
    const userID = await getAuthUserId(ctx);
    if (!userID) return null;
    return await ctx.db.get(userID);
  },
});
