import Image from "next/image";
import Link from "next/link";

export const BRAND_LOGO_SRC = "/brand/virtualkaksha-logo.png";

export function BrandLogo({
  href = "/",
  label = "VirtualKaksha",
  variant = "on-light",
  size = 36,
  wordmark = true,
  priority = false,
}: {
  href?: string;
  label?: string;
  variant?: "on-light" | "on-dark";
  size?: number;
  wordmark?: boolean;
  priority?: boolean;
}) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-2.5" aria-label={label}>
      <Image
        src={BRAND_LOGO_SRC}
        alt=""
        width={size}
        height={size}
        priority={priority}
        className={`object-contain ${variant === "on-dark" ? "invert" : ""}`}
        style={{ width: size, height: size }}
      />
      {wordmark ? (
        <span className={`text-lg font-bold tracking-tight sm:text-xl ${variant === "on-dark" ? "text-white" : "text-slate-950"}`}>
          {label}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </Link>
  );
}
