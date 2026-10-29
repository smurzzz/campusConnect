/**
 * Email-derived profile picture.
 *
 * Gravatar keys a user's picture on the MD5 of their lowercased, trimmed
 * email address. There is no MD5 in the browser and we don't want a
 * dependency just for this, so the digest is computed here — the standard
 * RFC 1321 implementation, verified against Node's `crypto` MD5.
 *
 * `d=identicon` returns a deterministic geometric pattern for addresses with
 * no Gravatar, so every account always renders an image instead of initials.
 */

function md5Hex(message: string): string {
  const data = new TextEncoder().encode(message);
  // 0x80 marker + 8-byte little-endian bit length, padded to 64-byte blocks.
  const total = Math.ceil((data.length + 9) / 64) * 64;
  const buffer = new Uint8Array(total);
  buffer.set(data);
  buffer[data.length] = 0x80;
  const view = new DataView(buffer.buffer);
  const bitLength = data.length * 8;
  view.setUint32(total - 8, bitLength >>> 0, true);
  view.setUint32(total - 4, Math.floor(bitLength / 0x100000000), true);

  // Per-round left-rotate amounts.
  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const constants = new Uint32Array(64);
  for (let i = 0; i < 64; i += 1) {
    constants[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
  }

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let offset = 0; offset < total; offset += 64) {
    const words = new Uint32Array(16);
    for (let i = 0; i < 16; i += 1) words[i] = view.getUint32(offset + i * 4, true);

    let a0 = a;
    let b0 = b;
    let c0 = c;
    let d0 = d;

    for (let i = 0; i < 64; i += 1) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b0 & c0) | (~b0 & d0);
        g = i;
      } else if (i < 32) {
        f = (d0 & b0) | (~d0 & c0);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b0 ^ c0 ^ d0;
        g = (3 * i + 5) % 16;
      } else {
        f = c0 ^ (b0 | ~d0);
        g = (7 * i) % 16;
      }
      const sum = (f + a0 + constants[i] + words[g]) >>> 0;
      a0 = d0;
      d0 = c0;
      c0 = b0;
      b0 = (b0 + ((sum << shifts[i]) | (sum >>> (32 - shifts[i])))) >>> 0;
    }

    a = (a + a0) >>> 0;
    b = (b + b0) >>> 0;
    c = (c + c0) >>> 0;
    d = (d + d0) >>> 0;
  }

  return [a, b, c, d]
    .map((word) => {
      let out = "";
      for (let i = 0; i < 4; i += 1) out += ((word >>> (i * 8)) & 0xff).toString(16).padStart(2, "0");
      return out;
    })
    .join("");
}

/** Gravatar URL for an email address, or `null` when there is no address. */
export function emailAvatarUrl(email: string | null | undefined, size = 160): string | null {
  const address = (email ?? "").trim().toLowerCase();
  if (!address) return null;
  return `https://www.gravatar.com/avatar/${md5Hex(address)}?d=identicon&s=${size}`;
}

/**
 * Clerk hands every photo-less account a generated initials picture served
 * from img.clerk.com, its payload base64-encoded into the path with
 * `"type":"default"`. That placeholder is not a real profile picture, so it
 * counts as "no photo" and the email's Gravatar is used instead.
 */
function isProviderPlaceholder(url: string): boolean {
  const payload = url.match(/^https:\/\/img\.clerk\.com\/([A-Za-z0-9_-]+)/)?.[1];
  if (!payload) return false;
  try {
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { type?: string };
    return decoded.type === "default";
  } catch {
    return false;
  }
}

/**
 * The picture to show on a profile: the sign-in provider's photo when the
 * account has one (Google puts it there), otherwise the email's Gravatar.
 */
export function profileAvatarUrl(
  providerImageUrl: string | null | undefined,
  email: string | null | undefined,
  size = 160,
): string | null {
  const provider = (providerImageUrl ?? "").trim();
  if (provider && !isProviderPlaceholder(provider)) return provider;
  return emailAvatarUrl(email, size);
}
