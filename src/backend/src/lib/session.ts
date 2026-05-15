import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export const makeJWT = (userId: string): string => {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
};

export const makeJWTCookie = (token: string): string => {
  // Max-Age is in seconds (7 days)
  const maxAge = 7 * 24 * 60 * 60;
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
};

export const getVerifiedUserID = (
  cookieHeader: string | undefined,
): string | null => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const token = cookies.session;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
};
