/**
 * Decode JWT payload (no signature verification). Used only to restore a minimal
 * user profile when /me cannot be reached while offline.
 */
export function decodeJwtUser(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    const base64 = padded + "=".repeat(padLen);
    const json = atob(base64);
    const p = JSON.parse(json);
    if (p.userId != null && p.email) {
      return {
        id: p.userId,
        email: p.email,
        fullName: p.fullName || "",
      };
    }
  } catch {
    return null;
  }
  return null;
}
