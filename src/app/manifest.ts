import type { MetadataRoute } from "next";

/** What makes Quotely installable: the name, colors, icons and a few home-screen shortcuts. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Quotely: Quotes, approvals and invoices",
    short_name: "Quotely",
    description: "Professional quotations, one-tap customer approval and invoices for service businesses.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#fbfdf8",
    theme_color: "#0e1c15",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New quote", short_name: "New quote", url: "/app/quotes/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Quotes", url: "/app/quotes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Invoices", url: "/app/invoices", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
