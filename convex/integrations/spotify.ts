import * as Cookies from "cookie-es";
import { httpAction, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { HttpRouter } from "convex/server";

const delayBetweenStateRefresh = 30 * 1000;

function generateRandomState() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

export const initiateOAuth = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) return new Response("Missing event ID", { status: 400 });

  const scopes = ["user-read-email", "user-read-currently-playing"];
  const state = generateRandomState();

  const authorizationURL = new URL("https://accounts.spotify.com/authorize");
  authorizationURL.searchParams.append("response_type", "code");
  authorizationURL.searchParams.append("client_id", process.env.SPOTIFY_CLIENT_ID!);
  authorizationURL.searchParams.append(
    "redirect_uri",
    process.env.CONVEX_SITE_URL! + "/integrations/spotify/auth/redirect"
  );
  authorizationURL.searchParams.append("scope", scopes.join(","));
  authorizationURL.searchParams.append("state", state);

  const headers = new Headers();
  headers.append("Set-Cookie", Cookies.serialize("oauth_state", state, { httpOnly: true, path: "/", maxAge: 300 }));
  headers.append("Set-Cookie", Cookies.serialize("event_id", eventId, { httpOnly: true, path: "/", maxAge: 300 }));
  headers.append("Location", authorizationURL.toString());

  return new Response(null, { status: 302, headers: headers });
});

export const handleAuthRedirect = httpAction(async (ctx, request) => {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookiesHeader = request.headers.get("Cookie");

  if (!code || !returnedState || !cookiesHeader) {
    return new Response("Invalid or missing parameters", { status: 400 });
  }

  const { oauth_state: storedState, event_id: eventId } = Cookies.parse(cookiesHeader);

  if (returnedState !== storedState || !eventId) {
    return new Response("Invalid state", { status: 400 });
  }

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${process.env.SPOTIFY_CLIENT_ID!}:${process.env.SPOTIFY_CLIENT_SECRET!}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.CONVEX_SITE_URL! + "/integrations/spotify/auth/redirect",
    }),
  });

  if (!tokenResponse.ok) {
    return new Response("Failed to fetch access token", { status: 500 });
  }

  const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = await tokenResponse.json();

  const userResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!userResponse.ok) {
    return new Response("Failed to fetch user data", { status: 500 });
  }

  const { display_name: name, images } = await userResponse.json();

  // Save everything in a mutation, and schedule a refresh token job
  await ctx.runMutation(internal.integrations.spotify.saveConnection, {
    eventId: eventId as Id<"events">,
    accessToken,
    refreshToken,
    name,
    expiresAt: Date.now() + expiresIn * 1000,
    image: { url: images[0].url },
  });

  const redirectURL = new URL(process.env.SITE_URL!);
  redirectURL.pathname = `/admin/${eventId}`;
  return new Response(null, { status: 302, headers: { Location: redirectURL.toString() } });
});

export const saveConnection = internalMutation({
  args: {
    eventId: v.id("events"),
    accessToken: v.string(),
    refreshToken: v.string(),
    name: v.string(),
    expiresAt: v.number(),
    image: v.object({ url: v.string() }),
  },
  handler: async (ctx, args) => {
    const prevConnection = await ctx.db
      .query("spotifyConnections")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();

    if (prevConnection) {
      await ctx.scheduler.cancel(prevConnection.scheduledUpdateState);
      await ctx.db.delete(prevConnection._id);
    }

    const scheduledUpdateState = await ctx.scheduler.runAfter(
      delayBetweenStateRefresh,
      internal.integrations.spotify.refreshState,
      {
        eventId: args.eventId,
      }
    );
    await ctx.db.insert("spotifyConnections", { ...args, scheduledUpdateState });
  },
});

export const getConnection = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    return ctx.db
      .query("spotifyConnections")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();
  },
});

export const refreshConnectionState = internalMutation({
  args: {
    eventId: v.id("events"),
    accessToken: v.string(),
    refreshToken: v.string(),
  },
  handler: async (ctx, { eventId, accessToken, refreshToken }) => {
    const connection = await ctx.db
      .query("spotifyConnections")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();
    if (!connection) throw new Error("Connection not found");

    await ctx.db.patch(connection._id, { accessToken, refreshToken });
  },
});

export const deleteConnection = internalMutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const connection = await ctx.db
      .query("spotifyConnections")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();
    if (connection) {
      await ctx.scheduler.cancel(connection.scheduledUpdateState);
      await ctx.db.delete(connection._id);
    }
    const state = await ctx.db
      .query("spotifyState")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();

    if (state) {
      await ctx.db.delete(state._id);
    }
  },
});

export const refreshState = internalAction({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const connection = await ctx.runQuery(internal.integrations.spotify.getConnection, { eventId });
    if (!connection) return;

    let token: string;
    if (connection.expiresAt < Date.now()) {
      const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${process.env.SPOTIFY_CLIENT_ID!}:${process.env.SPOTIFY_CLIENT_SECRET!}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: connection.refreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        await ctx.runMutation(internal.integrations.spotify.deleteConnection, { eventId });
        return;
      }

      const { access_token: accessToken, refresh_token: refreshToken } = await tokenResponse.json();
      await ctx.runMutation(internal.integrations.spotify.refreshConnectionState, {
        eventId,
        accessToken,
        refreshToken,
      });

      token = accessToken;
    } else {
      token = connection.accessToken;
    }

    // get curet song
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      await ctx.runMutation(internal.integrations.spotify.deleteConnection, { eventId });
      return;
    }

    const text = await response.text();
    if (text === "") {
      await ctx.runMutation(internal.integrations.spotify.updateCurrentlyPlaying, { eventId, track: undefined });
      return;
    }

    const data = JSON.parse(text);
    if (!data.is_playing || data.currently_playing_type !== "track") {
      await ctx.runMutation(internal.integrations.spotify.updateCurrentlyPlaying, { eventId, track: undefined });
    } else {
      const track = {
        name: data.item.name,
        artist: data.item.artists.map((a: any) => a.name).join(", "),
        image: data.item.album.images[0].url,
      };
      await ctx.runMutation(internal.integrations.spotify.updateCurrentlyPlaying, { eventId, track });
    }
  },
});

export const updateCurrentlyPlaying = internalMutation({
  args: {
    eventId: v.id("events"),
    track: v.optional(
      v.object({
        name: v.string(),
        artist: v.string(),
        image: v.string(),
      })
    ),
  },
  handler: async (ctx, { eventId, track }) => {
    const connection = await ctx.db
      .query("spotifyConnections")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();

    if (!connection) throw new Error("Connection not found");

    const state = await ctx.db
      .query("spotifyState")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();

    if (state) {
      await ctx.db.patch(state._id, { track });
    } else {
      await ctx.db.insert("spotifyState", { eventId, track });
    }

    const scheduledUpdateState = await ctx.scheduler.runAfter(
      delayBetweenStateRefresh * (track ? 1 : 5),
      internal.integrations.spotify.refreshState,
      {
        eventId,
      }
    );

    await ctx.db.patch(connection._id, { scheduledUpdateState });
  },
});

export function addHttpRoutes(http: HttpRouter) {
  http.route({
    method: "GET",
    path: "/integrations/spotify/auth",
    handler: initiateOAuth,
  });
  http.route({
    method: "GET",
    path: "/integrations/spotify/auth/redirect",
    handler: handleAuthRedirect,
  });
}
