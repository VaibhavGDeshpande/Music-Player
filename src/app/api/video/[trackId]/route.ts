import { getAccessToken } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TrackMetadata = {
  title: string;
  artists: string[];
};

type VideoCandidate = {
  videoId: string;
};

type JsonObject = Record<string, unknown>;

const DEFAULT_PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://piped-api.garudalinux.org",
  "https://api.piped.yt",
  "https://watchapi.whatever.social",
  "https://api.piped.projectsegfau.lt",
];

const configuredPipedInstances = process.env.PIPED_API_BASE_URLS
  ?.split(",")
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const configuredPipedBaseUrl = process.env.PIPED_API_BASE_URL?.trim().replace(/\/+$/, "");
const youtubeApiKey = process.env.YOUTUBE_API_KEY?.trim() || null;

const PIPED_INSTANCES = [
  ...(configuredPipedInstances?.length ? configuredPipedInstances : []),
  ...(configuredPipedBaseUrl ? [configuredPipedBaseUrl] : []),
  ...DEFAULT_PIPED_INSTANCES,
].filter((value, index, array) => array.indexOf(value) === index);

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSearchQueries(metadata: TrackMetadata) {
  const artistQuery = metadata.artists.join(" ");
  const baseQuery = `${metadata.title} ${artistQuery}`.trim();
  const queries = [
    `${baseQuery} official music video`,
    `${baseQuery} official audio`,
    `${baseQuery} soundtrack`,
    `${baseQuery} OST`,
    baseQuery,
  ];

  return queries.filter((query, index, array) => query && array.indexOf(query) === index);
}

async function fetchSpotifyTrackMetadata(
  userId: string,
  trackId: string
): Promise<TrackMetadata | null> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) return null;

  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = await response.json();

  if (!isJsonObject(data) || typeof data.name !== "string" || !Array.isArray(data.artists)) {
    return null;
  }

  const artists = data.artists
    .map((artist) => (isJsonObject(artist) && typeof artist.name === "string" ? artist.name : null))
    .filter((name): name is string => Boolean(name));

  return {
    title: data.name,
    artists: artists.length ? artists : ["Unknown"],
  };
}

async function resolveVideoIdWithYoutubeApi(
  metadata: TrackMetadata
): Promise<VideoCandidate | null> {
  if (!youtubeApiKey) return null;

  for (const query of getSearchQueries(metadata)) {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("maxResults", "5");
    url.searchParams.set("type", "video");
    url.searchParams.set("videoEmbeddable", "true");
    url.searchParams.set("q", query);
    url.searchParams.set("key", youtubeApiKey);

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;

      const data = await response.json();
      const items = isJsonObject(data) && Array.isArray(data.items) ? data.items : [];

      for (const item of items) {
        const id = isJsonObject(item) ? item.id : null;
        const videoId = isJsonObject(id) && typeof id.videoId === "string" ? id.videoId : null;
        if (videoId) return { videoId };
      }
    } catch (error) {
      console.error("YouTube video search failed:", query, error);
    }
  }

  return null;
}

async function resolveVideoIdWithPipedSearch(
  metadata: TrackMetadata
): Promise<VideoCandidate | null> {
  for (const query of getSearchQueries(metadata)) {
    for (const baseUrl of PIPED_INSTANCES) {
      try {
        const url = new URL("/search", baseUrl);
        url.searchParams.set("q", query);
        url.searchParams.set("filter", "videos");

        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) continue;

        const data = await response.json();
        const items = Array.isArray(data)
          ? data
          : isJsonObject(data) && Array.isArray(data.items)
            ? data.items
            : [];
        const firstVideo = items.find((item) => isJsonObject(item) && typeof item.url === "string");

        if (isJsonObject(firstVideo) && typeof firstVideo.url === "string") {
          const match = firstVideo.url.match(/(?:watch\?v=|\/watch\/|\/v\/)([^&/?]+)/);
          if (match?.[1]) return { videoId: match[1] };
        }
      } catch (error) {
        console.error("Piped video search failed:", baseUrl, query, error);
      }
    }
  }

  return null;
}

async function resolveVideoIdWithYoutubeSearchPage(
  metadata: TrackMetadata
): Promise<VideoCandidate | null> {
  for (const query of getSearchQueries(metadata)) {
    try {
      const url = new URL("https://www.youtube.com/results");
      url.searchParams.set("search_query", query);

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });
      if (!response.ok) continue;

      const html = await response.text();
      const match = html.match(/"videoId":"([^"]{11})"/);
      if (match?.[1]) return { videoId: match[1] };
    } catch (error) {
      console.error("YouTube search page failed:", query, error);
    }
  }

  return null;
}

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
    const metadata = await fetchSpotifyTrackMetadata(decoded.userId, trackId);

    if (!metadata) {
      return NextResponse.json(
        { error: "Failed to fetch Spotify metadata" },
        { status: 404 }
      );
    }

    const resolvedVideo =
      (await resolveVideoIdWithYoutubeApi(metadata)) ||
      (await resolveVideoIdWithPipedSearch(metadata)) ||
      (await resolveVideoIdWithYoutubeSearchPage(metadata));

    if (!resolvedVideo) {
      return NextResponse.json(
        {
          error: "Failed to resolve videoId",
          youtubeApiKeySet: Boolean(youtubeApiKey),
          pipedInstances: PIPED_INSTANCES,
          searchQueries: getSearchQueries(metadata),
          spotifyTrack: metadata,
        },
        { status: 502 }
      );
    }

    const embedUrl = new URL(
      `https://www.youtube-nocookie.com/embed/${resolvedVideo.videoId}`
    );
    embedUrl.searchParams.set("autoplay", "1");
    embedUrl.searchParams.set("playsinline", "1");
    embedUrl.searchParams.set("rel", "0");
    embedUrl.searchParams.set("modestbranding", "1");

    return NextResponse.redirect(embedUrl.toString());
  } catch (error) {
    console.error("Video API Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
