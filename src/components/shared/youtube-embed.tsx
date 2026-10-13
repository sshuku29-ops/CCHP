import { youTubeEmbedUrl } from "@/lib/youtube";

export function YouTubeEmbed({ url, title }: { url: string; title?: string }) {
  const src = youTubeEmbedUrl(url);
  if (!src) return <p className="text-sm text-destructive">Invalid YouTube link.</p>;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
      <iframe
        src={src}
        title={title ?? "Video"}
        className="h-full w-full"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
