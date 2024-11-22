import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
    githubLogin: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.string(),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index("email", ["email"]),
  // core
  events: defineTable({
    name: v.string(),
    slug: v.string(),
    endsAt: v.number(),
    isPublic: v.boolean(),
    fullScreenActivity: v.optional(v.boolean()),
    iframe: v.optional(v.string()),
    teamToShowId: v.optional(v.id("teams")),
    currentActivity: v.union(
      v.literal("iframe"),
      v.literal("place"),
      v.literal("teams"),
      v.literal("🍌🪩"),
      v.literal("off")
    ),
  })
    .index("by_slug", ["slug"])
    .index("by_isPublic", ["isPublic"]),
  eventAdmins: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
  })
    .index("by_eventId_userId", ["eventId", "userId"])
    .index("by_userId", ["userId"]),

  // info
  activities: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
  }).index("by_eventId", ["eventId"]),
  announcements: defineTable({
    eventId: v.id("events"),
    content: v.string(),
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
  // place
  placeState: defineTable({
    eventId: v.id("events"),
    colorOptions: v.array(v.string()),
    height: v.number(),
    width: v.number(),
  }).index("by_eventId", ["eventId"]),
  placeCommits: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    x: v.number(),
    y: v.number(),
    color: v.string(),
  }).index("by_eventId_userId", ["eventId", "userId"]),
  placePixelsRows: defineTable({
    eventId: v.id("events"),
    y: v.number(),
    colors: v.array(v.string()),
  }).index("by_eventId_y", ["eventId", "y"]),
  // Spotify
  spotifyConnections: defineTable({
    eventId: v.id("events"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scheduledUpdateState: v.id("_scheduled_functions"),
    name: v.string(),
    image: v.object({ url: v.string() }),
  }).index("by_eventId", ["eventId"]),
  spotifyState: defineTable({
    eventId: v.id("events"),
    track: v.optional(
      v.object({
        name: v.string(),
        artist: v.string(),
        image: v.string(),
        addedBy: v.optional(v.string()),
      })
    ),
  }).index("by_eventId", ["eventId"]),
  // teams
  teams: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    url: v.string(),
    members: v.array(
      v.object({
        githubUser: v.string(),
      })
    ),
  }).index("by_eventId", ["eventId"]),
});

export default schema;
