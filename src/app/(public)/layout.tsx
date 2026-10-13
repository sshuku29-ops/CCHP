import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { getSiteSettings } from "@/lib/public/queries";
import "@/components/public/public.css";

/**
 * Layout for every public page (no login). Adds the skip link, the header,
 * the footer, and the stationery stylesheet. The apply form under /apply
 * lives inside this layout too.
 */
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  return (
    <div className="pub-site pub-ground flex-1 flex flex-col min-h-full">
      <a href="#content" className="pub-skip">
        Skip to content
      </a>
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
