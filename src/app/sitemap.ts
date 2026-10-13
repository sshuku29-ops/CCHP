import type { MetadataRoute } from "next";
import { getPublishedReports } from "@/lib/public/queries";

/** Public pages only. Platform routes are never listed (see robots.ts). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const reports = await getPublishedReports();
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/team`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/impact`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/reports`, lastModified: now, changeFrequency: "yearly", priority: 0.7 },
    { url: `${base}/partners`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/resources`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/apply`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  for (const r of reports) {
    pages.push({ url: `${base}/reports/${r.year}`, lastModified: r.publishedAt ?? now, changeFrequency: "yearly", priority: 0.6 });
  }
  return pages;
}
