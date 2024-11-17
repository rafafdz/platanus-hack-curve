/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as activities from "../activities.js";
import type * as admin_activities from "../admin/activities.js";
import type * as admin_announcements from "../admin/announcements.js";
import type * as admin_events from "../admin/events.js";
import type * as admin_github from "../admin/github.js";
import type * as announcements from "../announcements.js";
import type * as auth from "../auth.js";
import type * as events from "../events.js";
import type * as githubPushEvents from "../githubPushEvents.js";
import type * as http from "../http.js";
import type * as integrations_github from "../integrations/github.js";
import type * as seed_githubPushEvents from "../seed/githubPushEvents.js";
import type * as users from "../users.js";
import type * as version from "../version.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  "admin/activities": typeof admin_activities;
  "admin/announcements": typeof admin_announcements;
  "admin/events": typeof admin_events;
  "admin/github": typeof admin_github;
  announcements: typeof announcements;
  auth: typeof auth;
  events: typeof events;
  githubPushEvents: typeof githubPushEvents;
  http: typeof http;
  "integrations/github": typeof integrations_github;
  "seed/githubPushEvents": typeof seed_githubPushEvents;
  users: typeof users;
  version: typeof version;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
