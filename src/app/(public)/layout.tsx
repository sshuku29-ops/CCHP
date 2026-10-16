import { CmsProvider } from "@/components/cms/cms-provider";
import { EditBar } from "@/components/cms/edit-bar";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { canEditContent, getContent } from "@/lib/cms/content";
import { getLogo, getSiteSettings } from "@/lib/public/queries";

// Public pages show live program numbers and admin-editable text, so they
// are rendered per request rather than frozen at build time.
export const dynamic = "force-dynamic";

/**
 * Layout for every public page (no login needed). Adds the skip link, the
 * admin edit bar (only visible to signed-in admins), the header and the footer.
 */
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [settings, canEdit, fullName, colbyLogo] = await Promise.all([getSiteSettings(), canEditContent(), getContent("site.fullName"), getLogo("Colby")]);
  return (
    <CmsProvider canEdit={canEdit}>
      <div className="flex min-h-full flex-1 flex-col bg-background text-foreground">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:outline-2 focus:outline-ring"
        >
          Skip to content
        </a>
        <EditBar />
        <SiteHeader fullName={fullName} />
        <main id="content" className="flex-1">
          {children}
        </main>
        <SiteFooter settings={settings} colbyLogoKey={colbyLogo?.fileKey ?? null} />
      </div>
    </CmsProvider>
  );
}
