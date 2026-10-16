import type { ElementType } from "react";
import { getContent } from "@/lib/cms/content";
import { EditableText } from "./editable-text";

/**
 * Server component: <Editable k="home.hero.title" as="h1" className="..." />
 * Looks up the text (admin override or default) and renders it as
 * click-to-edit for admins in editing mode, plain text for everyone else.
 */
export async function Editable({
  k,
  as,
  className,
  multiline,
}: {
  k: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
}) {
  const value = await getContent(k);
  return <EditableText k={k} value={value} as={as} className={className} multiline={multiline} />;
}
