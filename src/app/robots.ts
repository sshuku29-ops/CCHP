import type { MetadataRoute } from "next";

/**
 * Search engines may index the public site but never the login-gated
 * platform. Keep this list in step with PLATFORM_PREFIXES in src/proxy.ts.
 */
const PRIVATE_PATHS = [
  "/login",
  "/logout",
  "/api/",
  "/dashboard",
  "/projects",
  "/tasks",
  "/goals",
  "/calendar",
  "/waiting-on",
  "/feedback",
  "/recruitment",
  "/courses",
  "/hours",
  "/volunteers",
  "/sessions",
  "/reports-admin",
  "/handoff",
  "/settings",
  "/account",
  "/site-content",
  "/notifications",
  "/change-password",
];

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: `${base}/sitemap.xml`,
  };
}
