"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Opens the browser's print dialog for the current page. The label is passed
 * as children so the page can render it through <Editable>. Header, footer
 * and the edit bar are hidden in print via Tailwind's print: variant.
 */
export function PrintButton({ children }: { children: ReactNode }) {
  return (
    <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>
      {children}
    </Button>
  );
}
