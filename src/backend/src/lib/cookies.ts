import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export const makeJwt = (userId: string): string => {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
};

export const makeJwtCookie = (token: string): string => {
  // Max-Age is in seconds (7 days)
  const maxAge = 7 * 24 * 60 * 60;
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
};

export const clearSessionCookie = (): string => {
  return "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
};

export const getVerifiedUserId = (
  cookies: string[] | undefined,
): string | null => {
  if (!cookies) return null;

  const cookiesMap = cookies.reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const token = cookiesMap.session;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
};
