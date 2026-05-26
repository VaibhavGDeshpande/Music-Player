//working one 

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

type SpawnLikeError = Error & { code?: string };
type ExecFileResult = { stdout: string; stderr: string };

const execFileAsync = promisify(execFile);

let ytDlExec: ReturnType<typeof create> | null = null;
let ytDlpSource: string | null = null;
let ytDlpMode: "binary" | "python-module" | null = null;

try {
  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const configuredBinary = process.env.YT_DLP_PATH?.trim();
  const bundledBinary = path.join(
    process.cwd(),
    "node_modules",
    "youtube-dl-exec",
    "bin",
    binaryName
  );

  if (configuredBinary) {
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
  const flags = {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noWarnings: true,
    format: "bestaudio[ext=m4a]/bestaudio",
    addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
  };

  let ytOutput: YtDlpResult;

  if (ytDlExec && ytDlpMode === "binary") {
    ytOutput = (await ytDlExec(searchQuery, flags)) as YtDlpResult;
  } else {
    const args = [
      "-m",
      "yt_dlp",
      searchQuery,
      "--dump-single-json",
      "--no-check-certificates",
      "--no-warnings",
      "-f",
      "bestaudio[ext=m4a]/bestaudio",
      "--add-header",
      "referer:youtube.com",
      "--add-header",
      "user-agent:Mozilla/5.0",
    ];

    const result = (await execFileAsync("python", args, {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    })) as ExecFileResult;

    ytOutput = JSON.parse(result.stdout) as YtDlpResult;
  }

  return ytOutput?.entries?.[0]?.url ?? ytOutput?.url ?? null;
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

    let downloadLink: string | null = null;

    try {
      downloadLink = await resolveWithYtDlp(metadata);
    } catch (error) {
      console.error("yt-dlp execution failed:", error);

      const spawnError = error as SpawnLikeError;
      if (spawnError.code === "ENOENT") {
        try {
          ytDlpMode = "python-module";
          ytDlpSource = "python -m yt_dlp";
          downloadLink = await resolveWithYtDlp(metadata);
        } catch {
          return NextResponse.json(
            {
              error: "yt-dlp not installed locally",
              message: `Install yt-dlp or set YT_DLP_PATH. Tried: ${ytDlpSource ?? "unknown"}`,
            },
            { status: 500 }
          );
        }
      }
      if (!downloadLink) {
        return NextResponse.json(
          { error: "yt-dlp execution failed" },
          { status: 500 }
        );
      }
    }

    if (!downloadLink) {
      return NextResponse.json(
        {
          error: "Could not resolve audio URL",
          message: "Local yt-dlp did not return a playable audio URL",
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