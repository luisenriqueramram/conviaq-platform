import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

export interface JwtPayload {
  email: string;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
