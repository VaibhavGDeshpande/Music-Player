import { NextResponse } from 'next/server';

export async function GET() {
  const apiRoutes = [
    '/api/album/[id]',
    '/api/artist/[id]',
    '/api/auth/callback',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/capsule',
    '/api/download',
    '/api/liked-songs',
    '/api/lyrics',
    '/api/me',
    '/api/my-songs',
    '/api/player/log',
    '/api/playlists',
    '/api/playlists/[id]',
    '/api/search',
    '/api/stream/[trackId]',
    '/api/user-liked-songs',
    '/api/user-playlists',
    '/api/user-playlists/[id]',
    '/api/user-playlists/[id]/songs',
  ];

  return NextResponse.json({
    message: 'Available API Routes',
    routes: apiRoutes
  });
}
