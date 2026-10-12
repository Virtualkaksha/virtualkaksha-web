import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VirtualKaksha",
    short_name: "VirtualKaksha",
    description: "Structured learning resources for Classes 6–12.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    icons: [{ src: "/brand/virtualkaksha-logo.png", sizes: "any", type: "image/png" }],
  };
}
