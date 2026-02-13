export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface SpotifyProfile {
  id: string;
  display_name: string;
  email: string;
  country: string;
  product: string;
  images: { url: string }[];
}