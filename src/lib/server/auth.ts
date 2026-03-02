import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export type SessionClaims = {
  userId: string;
};

export async function getSessionClaims(): Promise<SessionClaims> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }
  return jwt.verify(token, process.env.JWT_SECRET!) as SessionClaims;
}
