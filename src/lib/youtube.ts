/**
 * Accepts the common YouTube URL shapes and returns the 11-char video id, or
 * null if the URL is not a YouTube link. We only ever store validated URLs
 * and render them through the official youtube-nocookie embed.
 */
export function parseYouTubeId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = /^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/.exec(url.pathname);
      if (m) id = m[1];
    }
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return id;
}

export function isYouTubeUrl(input: string) {
  return parseYouTubeId(input) !== null;
}

export function youTubeEmbedUrl(input: string) {
  const id = parseYouTubeId(input);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
