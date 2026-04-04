import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAccessToken } from "@/lib/spotify";
import { create } from "youtube-dl-exec";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TrackMetadata = {
  title: string;
  artist: string;
};

type YtDlpResult = {
  url?: string;
  entries?: Array<{ url?: string }>;
};

type SpawnLikeError = Error & {
  code?: string;
  stderr?: string;
  stdout?: string;
  format?: string;
  attemptedFormats?: string[];
};
type ExecFileResult = { stdout: string; stderr: string };
type ResolveResult = {
  url: string | null;
  source: string | null;
  mode: "binary" | "python-module" | null;
  cookiesPath: string | null;
  format: string | null;
  attemptedFormats: string[];
};

const execFileAsync = promisify(execFile);
const ytDlpCookiesPath = process.env.YT_DLP_COOKIES_PATH?.trim() || null;

// FIX 1: Always read extractor args from env so android_embedded client is passed through
const ytDlpExtractorArgs = process.env.YT_DLP_EXTRACTOR_ARGS?.trim() || null;

// FIX 2: Removed "ba" (invalid alias), use proper format strings only.
// bestaudio/best is the reliable catch-all for Cloud Run restricted manifests.
const ytDlpFormats = [
  process.env.YT_DLP_FORMAT?.trim(),
  "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio",
  "bestaudio/best",
  "best",
].filter(
  (value, index, array): value is string =>
    Boolean(value) && array.indexOf(value) === index
);

let ytDlExec: ReturnType<typeof create> | null = null;
let ytDlpSource: string | null = null;
let ytDlpMode: "binary" | "python-module" | null = null;

try {
  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";

  // FIX 3: YT_DLP_PATH must match the actual binary path in the Docker image.
  // Dockerfile installs to /opt/yt-dlp/bin/yt-dlp — ensure env var matches.
  const configuredBinary = process.env.YT_DLP_PATH?.trim();
  const bundledBinary = path.join(
    process.cwd(),
    "node_modules",
    "youtube-dl-exec",
    "bin",
    binaryName
  );

  if (configuredBinary && fs.existsSync(configuredBinary)) {
    // Only use configuredBinary if the file actually exists at that path
    ytDlExec = create(configuredBinary);
    ytDlpSource = configuredBinary;
    ytDlpMode = "binary";
  } else if (fs.existsSync(bundledBinary)) {
    ytDlExec = create(bundledBinary);
    ytDlpSource = bundledBinary;
    ytDlpMode = "binary";
  } else {
    ytDlExec = create(binaryName);
    ytDlpSource = binaryName;
    ytDlpMode = "binary";
  }
} catch (error) {
  console.error("yt-dlp init failed:", error);
  ytDlExec = null;
  ytDlpSource = null;
  ytDlpMode = null;
}

function getResolvedCookiesPath() {
  if (!ytDlpCookiesPath) return null;
  return fs.existsSync(ytDlpCookiesPath) ? ytDlpCookiesPath : null;
}

async function fetchSpotifyTrack(userId: string, trackId: string): Promise<TrackMetadata | null> {
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
        data.artists?.map((artist: { name: string }) => artist.name).join(", ") ||
        "Unknown",
    };
  } catch (error) {
    console.error("Spotify fetch error:", error);
    return null;
  }
}

async function resolveWithYtDlp(metadata: TrackMetadata) {
  const searchQuery = `ytsearch1:${metadata.title} ${metadata.artist} audio`;
  const cookiesPath = getResolvedCookiesPath();
  let lastError: SpawnLikeError | null = null;
  let lastTriedFormat: string | null = null;

  for (const format of ytDlpFormats) {
    lastTriedFormat = format;
    try {
      const flags = {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        format,
        addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
        // FIX 4: extractor-args is critical — passes android_embedded player client
        // so YouTube serves a valid manifest even from Cloud Run IPs.
        ...(ytDlpExtractorArgs ? { extractorArgs: ytDlpExtractorArgs } : {}),
        ...(cookiesPath ? { cookies: cookiesPath } : {}),
      };

      let ytOutput: YtDlpResult;

      if (ytDlExec && ytDlpMode === "binary") {
        ytOutput = (await ytDlExec(searchQuery, flags)) as YtDlpResult;
      } else {
        // FIX 5: Python module fallback — extractor-args was already present in
        // original code but double-checked it's passed correctly here.
        const args = [
          "-m",
          "yt_dlp",
          searchQuery,
          "--dump-single-json",
          "--no-check-certificates",
          "--no-warnings",
          "-f",
          format,
          "--add-header",
          "referer:youtube.com",
          "--add-header",
          "user-agent:Mozilla/5.0",
        ];
        if (cookiesPath) {
          args.push("--cookies", cookiesPath);
        }
        if (ytDlpExtractorArgs) {
          args.push("--extractor-args", ytDlpExtractorArgs);
        }

        const result = (await execFileAsync("python3", args, {
          windowsHide: true,
          maxBuffer: 10 * 1024 * 1024,
        })) as ExecFileResult;

        ytOutput = JSON.parse(result.stdout) as YtDlpResult;
      }

      return {
        url: ytOutput?.entries?.[0]?.url ?? ytOutput?.url ?? null,
        source: ytDlpSource,
        mode: ytDlpMode,
        cookiesPath,
        format,
        attemptedFormats: ytDlpFormats,
      } as ResolveResult;
    } catch (error) {
      lastError = error as SpawnLikeError;
      lastError.format = format;
      lastError.attemptedFormats = ytDlpFormats;
      const details = lastError.stderr || lastError.message || "";
      // Only continue loop on format-not-available; throw everything else immediately
      if (!details.includes("Requested format is not available")) {
        throw error;
      }
    }
  }

  if (lastError) {
    lastError.format = lastTriedFormat ?? undefined;
    lastError.attemptedFormats = ytDlpFormats;
  }

  throw lastError ?? new Error("yt-dlp did not find a playable format");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    console.log("Incoming stream request");

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

    const { data: existingSong, error } = await supabase
      .from("songs")
      .select("storage_path")
      .eq("user_id", decoded.userId)
      .eq("spotify_id", trackId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
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

    const metadata = await fetchSpotifyTrack(decoded.userId, trackId);
    if (!metadata) {
      return NextResponse.json(
        { error: "Failed to fetch Spotify metadata" },
        { status: 404 }
      );
    }

    let resolveResult: ResolveResult = {
      url: null,
      source: ytDlpSource,
      mode: ytDlpMode,
      cookiesPath: getResolvedCookiesPath(),
      format: null,
      attemptedFormats: ytDlpFormats,
    };

    try {
      resolveResult = await resolveWithYtDlp(metadata);
    } catch (error) {
      console.error("yt-dlp execution failed:", {
        error,
        source: ytDlpSource,
        mode: ytDlpMode,
        cookiesPath: getResolvedCookiesPath(),
      });

      const spawnError = error as SpawnLikeError;
      if (spawnError.code === "ENOENT") {
        try {
          ytDlpMode = "python-module";
          ytDlpSource = "python3 -m yt_dlp"; // FIX 6: use python3 not python in Debian image
          resolveResult = await resolveWithYtDlp(metadata);
        } catch (fallbackError) {
          const typedFallbackError = fallbackError as SpawnLikeError;
          const fallbackDetails =
            typedFallbackError.stderr || typedFallbackError.message || "Unknown yt-dlp error";
          const isFallbackMissing =
            typedFallbackError.code === "ENOENT" ||
            fallbackDetails.includes("No module named yt_dlp");

          return NextResponse.json(
            {
              error: isFallbackMissing
                ? "yt-dlp not installed"
                : "yt-dlp failed to resolve audio",
              message: isFallbackMissing
                ? `Install yt-dlp or set YT_DLP_PATH. Tried: ${ytDlpSource ?? "unknown"}`
                : "yt-dlp fallback executed but did not return a playable audio stream",
              details: fallbackDetails,
              source: ytDlpSource,
              mode: ytDlpMode,
              cookiesPath: getResolvedCookiesPath(),
              format: typedFallbackError.format ?? resolveResult.format,
              attemptedFormats:
                typedFallbackError.attemptedFormats ?? resolveResult.attemptedFormats,
            },
            { status: isFallbackMissing ? 500 : 502 }
          );
        }
      }
      if (!resolveResult.url) {
        return NextResponse.json(
          {
            error: "yt-dlp failed to resolve audio",
            details: spawnError.stderr || spawnError.message,
            source: ytDlpSource,
            mode: ytDlpMode,
            cookiesPath: getResolvedCookiesPath(),
            format: spawnError.format ?? resolveResult.format,
            attemptedFormats:
              spawnError.attemptedFormats ?? resolveResult.attemptedFormats,
          },
          { status: 502 }
        );
      }
    }

    const downloadLink = resolveResult.url;

    if (!downloadLink) {
      return NextResponse.json(
        {
          error: "Could not resolve audio URL",
          message: "yt-dlp did not return a playable audio URL",
          source: resolveResult.source,
          mode: resolveResult.mode,
          cookiesPath: resolveResult.cookiesPath,
          format: resolveResult.format,
          attemptedFormats: resolveResult.attemptedFormats,
        },
        { status: 502 }
      );
    }

    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.youtube.com/",
    };

    if (rangeHeader) fetchHeaders.Range = rangeHeader;

    const upstream = await fetch(downloadLink, {
      headers: fetchHeaders,
      cache: "no-store",
    });

    if ((!upstream.ok && upstream.status !== 206) || !upstream.body) {
      throw new Error("Failed to fetch audio stream");
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", "audio/mp4");
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