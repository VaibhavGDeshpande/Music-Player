import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrackMetadata = {
  title: string;
  artist: string;
};

type SearchCandidate = {
  title?: string;
  uploaderName?: string;
  uploader?: string;
  type?: string;
  duration?: number;
};

type PipedSearchResult = {
  title?: string;
  type?: string;
  url?: string;
  duration?: number;
  uploaderName?: string;
  uploader?: string;
};

type PipedAudioStream = {
  url?: string;
  bitrate?: number;
  format?: string;
  mimeType?: string;
  quality?: string;
  videoOnly?: boolean;
};

type PipedStreamsResponse = {
  audioStreams?: PipedAudioStream[];
  proxyUrl?: string;
};

type PipedInstance = {
  api_url?: string;
  up?: boolean;
};

type YoutubeSearchItem = {
  id?: {
    kind?: string;
    videoId?: string;
  };
  snippet?: {
    title?: string;
    channelTitle?: string;
  };
};

type YoutubeSearchResponse = {
  items?: YoutubeSearchItem[];
};

type InvidiousAdaptiveFormat = {
  url?: string;
  bitrate?: string;
  type?: string;
  audioQuality?: string;
};

type InvidiousVideoResponse = {
  adaptiveFormats?: InvidiousAdaptiveFormat[];
};

type ResolvedVideo = {
  searchQuery: string;
  videoId: string;
  videoUrl: string;
};

type ResolvedAudio = {
  searchQuery: string;
  videoId: string;
  videoUrl: string;
  streamUrl: string;
  mimeType: string | null;
  resolvedVia: string;
};

// ─── Constants & Config ───────────────────────────────────────────────────────

const youtubeApiKey = process.env.YOUTUBE_API_KEY?.trim() || null;

const FALLBACK_PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://piped-api.garudalinux.org",
  "https://api.piped.yt",
  "https://watchapi.whatever.social",
  "https://api.piped.projectsegfau.lt",
];

const INVIDIOUS_INSTANCES = [
  "https://invidious.snopyta.org",
  "https://invidious.kavin.rocks",
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.privacyredirect.com",
];

// Module-level cache — persists across requests within the same container instance
let cachedPipedInstances: string[] | null = null;
let instancesCachedAt = 0;
const INSTANCES_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

// ─── Live Piped Instance Fetcher ──────────────────────────────────────────────

async function getLivePipedInstances(): Promise<string[]> {
  const now = Date.now();

  if (cachedPipedInstances && now - instancesCachedAt < INSTANCES_CACHE_TTL) {
    return cachedPipedInstances;
  }

  try {
    const res = await fetch("https://piped-instances.kavin.rocks/", {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`Instances list returned ${res.status}`);

    const data = (await res.json()) as PipedInstance[];

    const liveInstances = data
      .filter((instance) => instance.up !== false && instance.api_url)
      .map((instance) => instance.api_url!.trim().replace(/\/+$/, ""))
      .filter(Boolean);

    if (liveInstances.length === 0) throw new Error("Empty instances list returned");

    console.log(`[Piped] Fetched ${liveInstances.length} live instances`);
    cachedPipedInstances = liveInstances;
    instancesCachedAt = now;

    return liveInstances;
  } catch (error) {
    console.warn(
      "[Piped] Failed to fetch live instances, using fallback list:",
      error instanceof Error ? error.message : error
    );
    return FALLBACK_PIPED_INSTANCES;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractVideoIdFromUrl(value?: string | null) {
  if (!value) return null;

  try {
    if (value.startsWith("/watch")) {
      const url = new URL(value, "https://www.youtube.com");
      return url.searchParams.get("v");
    }

    const url = new URL(value);
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v");
    }
    if (url.hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }
  } catch {
    return null;
  }

  return null;
}

function resolveAbsoluteUrl(value: string, ...bases: Array<string | null | undefined>) {
  if (/^https?:\/\//i.test(value)) return value;

  for (const base of bases) {
    if (!base) continue;
    try {
      return new URL(value, base).toString();
    } catch {
      continue;
    }
  }

  return value;
}

function scoreSearchResult(result: SearchCandidate, metadata: TrackMetadata) {
  const desiredTitle = normalizeText(metadata.title);
  const desiredArtists = metadata.artist
    .split(",")
    .map((a) => normalizeText(a))
    .filter(Boolean);

  const title = normalizeText(result.title || "");
  const uploader = normalizeText(result.uploaderName || result.uploader || "");

  let score = 0;

  if (result.type === "stream") score += 20;
  if (title.includes(desiredTitle) && desiredTitle) score += 60;

  for (const artist of desiredArtists) {
    if (title.includes(artist)) score += 20;
    if (uploader.includes(artist)) score += 15;
  }

  if (result.duration && result.duration > 30 && result.duration < 900) {
    score += 10;
  }

  return score;
}

function pickBestAudioStream(streams: PipedAudioStream[]) {
  return [...streams]
    .filter((stream) => Boolean(stream.url) && !stream.videoOnly)
    .sort((left, right) => {
      const leftAudio = left.mimeType?.startsWith("audio/") ? 1 : 0;
      const rightAudio = right.mimeType?.startsWith("audio/") ? 1 : 0;
      if (rightAudio !== leftAudio) return rightAudio - leftAudio;

      const leftBitrate = left.bitrate ?? 0;
      const rightBitrate = right.bitrate ?? 0;
      if (rightBitrate !== leftBitrate) return rightBitrate - leftBitrate;

      const leftMp4 = left.mimeType?.includes("mp4") || left.format === "M4A" ? 1 : 0;
      const rightMp4 = right.mimeType?.includes("mp4") || right.format === "M4A" ? 1 : 0;
      return rightMp4 - leftMp4;
    })[0];
}

function parsePipedSearchItems(payload: unknown): PipedSearchResult[] {
  if (Array.isArray(payload)) return payload as PipedSearchResult[];

  if (
    payload &&
    typeof payload === "object" &&
    "items" in payload &&
    Array.isArray((payload as { items?: unknown[] }).items)
  ) {
    return (payload as { items: PipedSearchResult[] }).items;
  }

  return [];
}

// ─── Spotify ──────────────────────────────────────────────────────────────────

async function fetchSpotifyTrack(
  userId: string,
  trackId: string
): Promise<TrackMetadata | null> {
  try {
    const accessToken = await getAccessToken(userId);
    if (!accessToken) return null;

    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();

    return {
      title: data.name as string,
      artist:
        data.artists?.map((a: { name: string }) => a.name).join(", ") || "Unknown",
    };
  } catch (error) {
    console.error("[Spotify] Fetch error:", error);
    return null;
  }
}

// ─── Video ID Resolution ──────────────────────────────────────────────────────

async function resolveVideoIdWithYoutubeApi(
  metadata: TrackMetadata
): Promise<ResolvedVideo | null> {
  if (!youtubeApiKey) return null;

  const searchQuery = `${metadata.title} ${metadata.artist} audio`;

  // Two attempts: music category first, then unrestricted
  const variants = [
    { videoCategoryId: "10", videoEmbeddable: "true" },
    { videoEmbeddable: "true" },
  ];

  for (const variant of variants) {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "8");
    url.searchParams.set("q", searchQuery);
    url.searchParams.set("key", youtubeApiKey);

    for (const [key, value] of Object.entries(variant)) {
      url.searchParams.set(key, value);
    }

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`YouTube API search returned ${res.status}`);

    const data = (await res.json()) as YoutubeSearchResponse;

    const candidates = (data.items ?? []).flatMap((item) => {
      if (!item.id?.videoId) return [];
      return [
        {
          videoId: item.id.videoId,
          score: scoreSearchResult(
            {
              title: item.snippet?.title,
              uploaderName: item.snippet?.channelTitle,
              type: item.id.kind === "youtube#video" ? "stream" : undefined,
            },
            metadata
          ),
        },
      ];
    });

    const best = candidates.sort((a, b) => b.score - a.score)[0];

    if (best) {
      console.log(`[YouTube API] Resolved videoId: ${best.videoId}`);
      return {
        searchQuery,
        videoId: best.videoId,
        videoUrl: `https://www.youtube.com/watch?v=${best.videoId}`,
      };
    }
  }

  return null;
}

async function resolveVideoIdWithPipedSearch(
  metadata: TrackMetadata
): Promise<ResolvedVideo | null> {
  const searchQuery = `${metadata.title} ${metadata.artist} audio`;
  const instances = await getLivePipedInstances();

  for (const instance of instances) {
    try {
      const searchPaths = [
        `${instance}/search?q=${encodeURIComponent(searchQuery)}&filter=music_songs`,
        `${instance}/search?q=${encodeURIComponent(searchQuery)}&filter=videos`,
        `${instance}/search?q=${encodeURIComponent(searchQuery)}`,
      ];

      let searchResults: PipedSearchResult[] = [];

      for (const searchUrl of searchPaths) {
        const res = await fetch(searchUrl, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) {
          console.warn(`[Piped] ${instance} returned ${res.status} for search`);
          continue;
        }

        searchResults = parsePipedSearchItems(await res.json());
        if (searchResults.length > 0) break;
      }

      const best = searchResults
        .map((result) => ({
          result,
          videoId: extractVideoIdFromUrl(result.url),
          score: scoreSearchResult(result, metadata),
        }))
        .filter(
          (c): c is { result: PipedSearchResult; videoId: string; score: number } =>
            Boolean(c.videoId)
        )
        .sort((a, b) => b.score - a.score)[0];

      if (!best) continue;

      console.log(`[Piped] Search resolved videoId: ${best.videoId} via ${instance}`);
      return {
        searchQuery,
        videoId: best.videoId,
        videoUrl: `https://www.youtube.com/watch?v=${best.videoId}`,
      };
    } catch (error) {
      console.warn(
        `[Piped] Search failed on ${instance}:`,
        error instanceof Error ? error.message : error
      );
      continue;
    }
  }

  return null;
}

async function resolveVideoId(metadata: TrackMetadata): Promise<ResolvedVideo | null> {
  // Primary: official YouTube Data API — no IP blocking from Cloud Run
  try {
    const result = await resolveVideoIdWithYoutubeApi(metadata);
    if (result) return result;
  } catch (error) {
    console.warn(
      "[YouTube API] Failed, falling back to Piped search:",
      error instanceof Error ? error.message : error
    );
  }

  // Fallback: Piped search across live instances
  return resolveVideoIdWithPipedSearch(metadata);
}

// ─── Stream URL Resolution ────────────────────────────────────────────────────

async function resolveStreamWithPiped(
  videoId: string
): Promise<{ streamUrl: string; mimeType: string | null; instance: string } | null> {
  const instances = await getLivePipedInstances();

  for (const instance of instances) {
    try {
      const res = await fetch(`${instance}/streams/${videoId}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        console.warn(`[Piped] ${instance} streams returned ${res.status}`);
        continue;
      }

      const data = (await res.json()) as PipedStreamsResponse;
      const best = pickBestAudioStream(data.audioStreams ?? []);

      if (!best?.url) continue;

      console.log(`[Piped] Stream resolved via ${instance}`);
      return {
        streamUrl: resolveAbsoluteUrl(best.url, data.proxyUrl, instance),
        mimeType: best.mimeType ?? null,
        instance,
      };
    } catch (error) {
      console.warn(
        `[Piped] Streams failed on ${instance}:`,
        error instanceof Error ? error.message : error
      );
      continue;
    }
  }

  return null;
}

async function resolveStreamWithInvidious(
  videoId: string
): Promise<{ streamUrl: string; mimeType: string | null; instance: string } | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(
        `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!res.ok) {
        console.warn(`[Invidious] ${instance} returned ${res.status}`);
        continue;
      }

      const data = (await res.json()) as InvidiousVideoResponse;

      const best = (data.adaptiveFormats ?? [])
        .filter((f) => f.url && f.type?.startsWith("audio/"))
        .sort(
          (a, b) => parseInt(b.bitrate ?? "0") - parseInt(a.bitrate ?? "0")
        )[0];

      if (!best?.url) continue;

      console.log(`[Invidious] Stream resolved via ${instance}`);
      return {
        streamUrl: best.url,
        mimeType: best.type ?? null,
        instance,
      };
    } catch (error) {
      console.warn(
        `[Invidious] Failed on ${instance}:`,
        error instanceof Error ? error.message : error
      );
      continue;
    }
  }

  return null;
}

// ─── Main Audio Resolver ──────────────────────────────────────────────────────

async function resolveAudio(metadata: TrackMetadata): Promise<ResolvedAudio | null> {
  // Step 1: Get videoId via YouTube API or Piped search
  const resolvedVideo = await resolveVideoId(metadata);

  if (!resolvedVideo) {
    console.error("[Resolver] Could not find videoId from any source");
    return null;
  }

  // Step 2: Get stream URL — Piped first, Invidious as fallback
  const pipedStream = await resolveStreamWithPiped(resolvedVideo.videoId);

  if (pipedStream) {
    return {
      searchQuery: resolvedVideo.searchQuery,
      videoId: resolvedVideo.videoId,
      videoUrl: resolvedVideo.videoUrl,
      streamUrl: pipedStream.streamUrl,
      mimeType: pipedStream.mimeType,
      resolvedVia: `piped:${pipedStream.instance}`,
    };
  }

  console.warn("[Resolver] All Piped instances failed, trying Invidious...");

  const invidiousStream = await resolveStreamWithInvidious(resolvedVideo.videoId);

  if (invidiousStream) {
    return {
      searchQuery: resolvedVideo.searchQuery,
      videoId: resolvedVideo.videoId,
      videoUrl: resolvedVideo.videoUrl,
      streamUrl: invidiousStream.streamUrl,
      mimeType: invidiousStream.mimeType,
      resolvedVia: `invidious:${invidiousStream.instance}`,
    };
  }

  console.error(
    "[Resolver] Piped and Invidious both failed for videoId:",
    resolvedVideo.videoId
  );
  return null;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not set");
    }

    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: { userId: string };

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
    } catch (error) {
      console.error("JWT verify failed:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { trackId } = await params;
    const rangeHeader = request.headers.get("range");

    // ── Path 1: Supabase Cache ─────────────────────────────────────────────────

    const { data: existingSong, error: supabaseError } = await supabase
      .from("songs")
      .select("storage_path")
      .eq("user_id", decoded.userId)
      .eq("spotify_id", trackId)
      .maybeSingle();

    if (supabaseError) {
      console.error("Supabase error:", supabaseError);
    }

    if (existingSong?.storage_path) {
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${existingSong.storage_path}`;
      const fetchHeaders: Record<string, string> = {};
      if (rangeHeader) fetchHeaders.Range = rangeHeader;

      const upstream = await fetch(publicUrl, {
        headers: fetchHeaders,
        cache: "no-store",
      });

      if (!upstream.ok || !upstream.body) {
        throw new Error("Failed to fetch from Supabase storage");
      }

      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", "audio/mpeg");
      responseHeaders.set("Accept-Ranges", "bytes");

      const contentLength = upstream.headers.get("content-length");
      if (contentLength) responseHeaders.set("Content-Length", contentLength);

      const contentRange = upstream.headers.get("content-range");
      if (contentRange) responseHeaders.set("Content-Range", contentRange);

      return new Response(upstream.body, {
        status: rangeHeader ? 206 : upstream.status,
        headers: responseHeaders,
      });
    }

    // ── Path 2: Resolve via YouTube + Piped/Invidious ─────────────────────────

    const metadata = await fetchSpotifyTrack(decoded.userId, trackId);
    if (!metadata) {
      return NextResponse.json(
        { error: "Failed to fetch Spotify metadata" },
        { status: 404 }
      );
    }

    const resolvedAudio = await resolveAudio(metadata);

    if (!resolvedAudio) {
      const livePipedInstances = await getLivePipedInstances();
      return NextResponse.json(
        {
          error: "All resolvers failed",
          youtubeApiKeySet: Boolean(youtubeApiKey),   // ← false means key missing in Cloud Run
          livePipedInstanceCount: livePipedInstances.length,
          invidiousInstances: INVIDIOUS_INSTANCES,
          searchQuery: `${metadata.title} ${metadata.artist} audio`,
        },
        { status: 502 }
      );
    }

    // ── Proxy the resolved audio stream ───────────────────────────────────────

    const fetchHeaders: Record<string, string> = {};
    if (rangeHeader) fetchHeaders.Range = rangeHeader;

    const upstream = await fetch(resolvedAudio.streamUrl, {
      headers: fetchHeaders,
      cache: "no-store",
    });

    if ((!upstream.ok && upstream.status !== 206) || !upstream.body) {
      return NextResponse.json(
        {
          error: "Failed to fetch audio stream",
          httpStatus: upstream.status,
          resolvedVia: resolvedAudio.resolvedVia,
          videoId: resolvedAudio.videoId,
          videoUrl: resolvedAudio.videoUrl,
          streamUrl: resolvedAudio.streamUrl,
          searchQuery: resolvedAudio.searchQuery,
        },
        { status: 502 }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      resolvedAudio.mimeType || upstream.headers.get("content-type") || "audio/mp4"
    );
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "no-store");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new Response(upstream.body, {
      status: rangeHeader ? 206 : upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Stream API Error:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}