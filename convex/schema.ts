import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  // core
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
  // info
  activities: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
  }).index("by_eventId", ["eventId"]),
  // github
  githubWebhookConfigs: defineTable({
    eventId: v.id("events"),
    secret: v.string(),
  }).index("by_eventId", ["eventId"]),
  githubPushEvents: defineTable({
    eventId: v.id("events"),
    repoName: v.string(),
    author: v.string(),
    message: v.string(),
    timestamp: v.number(),
    branch: v.string(),
  }).index("by_eventId", ["eventId"]),
});

export default schema;
