const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47];
const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP_TAG = [0x57, 0x45, 0x42, 0x50];

export const STUDENT_AVATAR_MAX_BYTES = 1_048_576;
export const STUDENT_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function sniffImageType(bytes: Uint8Array) {
  if (bytes.length >= 3 && startsWith(bytes, JPEG)) return "image/jpeg";
  if (bytes.length >= 4 && startsWith(bytes, PNG)) return "image/png";
  if (bytes.length >= 12 && startsWith(bytes, WEBP_RIFF) && startsWith(bytes, WEBP_TAG, 8)) return "image/webp";
  return null;
}

function normalizeDeclaredType(type: string) {
  return type === "image/jpg" ? "image/jpeg" : type;
}

export { STUDENT_AVATAR_SRC } from "@/lib/students/nav-profile";

export function encodeStudentAvatar(bytes: Uint8Array, declaredType: string) {
  if (!bytes.length) {
    return { ok: false as const, message: "Choose a photo to upload." };
  }
  if (bytes.length > STUDENT_AVATAR_MAX_BYTES) {
    return { ok: false as const, message: "Use a photo smaller than 1 MB." };
  }
  const sniffed = sniffImageType(bytes);
  if (!sniffed || !STUDENT_AVATAR_TYPES.includes(sniffed)) {
    return { ok: false as const, message: "Use a JPG, PNG or WEBP photo." };
  }
  const declared = normalizeDeclaredType(declaredType.trim().toLowerCase());
  if (declared && declared !== sniffed && declared !== "application/octet-stream") {
    return { ok: false as const, message: "Use a JPG, PNG or WEBP photo." };
  }
  const dataUrl = `data:${sniffed};base64,${Buffer.from(bytes).toString("base64")}`;
  return { ok: true as const, dataUrl };
}

export function decodeStudentAvatar(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(dataUrl);
  if (!match) return { ok: false as const };
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > STUDENT_AVATAR_MAX_BYTES) return { ok: false as const };
  const sniffed = sniffImageType(bytes);
  if (sniffed !== match[1]) return { ok: false as const };
  return { ok: true as const, mimeType: sniffed, bytes };
}
