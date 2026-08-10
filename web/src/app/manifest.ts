import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mbokk — Registre de famille numérique",
    short_name: "Mbokk",
    description: "Registre de famille numérique du Sénégal",
    start_url: "/",
    display: "standalone",
    background_color: "#e2decf",
    theme_color: "#3b4b8c",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
