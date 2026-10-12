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
    icons: [
      { src: "/brand/virtualkaksha-icon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/brand/virtualkaksha-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  };
}
