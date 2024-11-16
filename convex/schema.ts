import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  events: defineTable({
    name: v.string(),
    slug: v.string(),
    endsAt: v.number(),
    isPublic: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_isPublic", ["isPublic"]),
  eventAdmins: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
  })
    .index("by_eventId", ["eventId"])
    .index("by_userId", ["userId"]),
});

export default schema;
