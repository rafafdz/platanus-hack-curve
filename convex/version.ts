import { query } from "./_generated/server";

export const current = query({
  handler: async (ctx) => {
    return process.env.VERSION ?? "00-00-00:00:00";
  },
});
