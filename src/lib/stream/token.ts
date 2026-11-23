import "server-only";
import { importPKCS8, SignJWT } from "jose";

export type PlaybackSource =
  | { ok: true; src: string }
  | { ok: false; reason: "not-configured" | "failed" };

const TOKEN_TTL = "2h";

// Creates a short-lived signed token so only logged-in, entitled students can play a video.
// Needs the Stream signing key from the client's Cloudflare account:
//   STREAM_SIGNING_KEY_ID              key id
//   STREAM_SIGNING_PRIVATE_KEY_BASE64  base64 of the PKCS#8 PEM private key
export async function getPlaybackSource(videoUid: string): Promise<PlaybackSource> {
  const kid = process.env.STREAM_SIGNING_KEY_ID;
  const pemBase64 = process.env.STREAM_SIGNING_PRIVATE_KEY_BASE64;
  if (!kid || !pemBase64) return { ok: false, reason: "not-configured" };

  try {
    const pem = Buffer.from(pemBase64, "base64").toString("utf8");
    const key = await importPKCS8(pem, "RS256");
    const token = await new SignJWT({ kid })
      .setProtectedHeader({ alg: "RS256", kid })
      .setSubject(videoUid)
      .setIssuedAt()
      .setExpirationTime(TOKEN_TTL)
      .sign(key);
    return { ok: true, src: token };
  } catch (err) {
    // Log the cause server-side only. Never log the key itself.
    console.error("Stream token signing failed:", err instanceof Error ? err.message : err);
    return { ok: false, reason: "failed" };
  }
}
