/**
 * Hertzy Anonymous User Code Generator & Store
 * 
 * Privacy Policy & Security Specifications:
 * 1. Generates an opaque random UUID-based identifier (e.g. "U-7F3A21B0").
 * 2. NEVER derived from names, emails, IPs, or device fingerprints.
 * 3. Preserves cross-session tracking for fraud frequency metrics (e.g. "same user had 3 high-risk calls")
 *    while completely decoupling real personal identity from the admin telemetry pipeline.
 * 4. Stored strictly client-side in localStorage ("hertzy_anonymous_user_code").
 */

const STORAGE_KEY = "hertzy_user_id";
const LEGACY_KEY = "hertzy_anonymous_user_code";

export function getOrCreateAnonymousUserId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    if (existing && /^U-[A-Z0-9]{6,12}$/i.test(existing.trim())) {
      const code = existing.trim().toUpperCase();
      localStorage.setItem(STORAGE_KEY, code);
      return code;
    }
  } catch (e) {
    // Storage access might be restricted in some iframe contexts
  }

  // Generate a random 8-character hex code from cryptographically secure random bytes/UUID
  let randomHex = "";
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    randomHex = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  } else if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    randomHex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  } else {
    randomHex = Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  const newCode = `U-${randomHex}`;

  try {
    localStorage.setItem(STORAGE_KEY, newCode);
  } catch (e) {
    // Ignore storage errors
  }

  return newCode;
}

export const getOrCreateAnonymousUserCode = getOrCreateAnonymousUserId;
