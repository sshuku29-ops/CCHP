"use client";

import { Button } from "@/components/ui/button";

/** Opens the browser print dialog; "Save as PDF" is a printer option there. Hidden when printing. */
export function PrintButton() {
  return (
    <Button type="button" className="no-print" onClick={() => window.print()}>
      Print / Save as PDF
    </Button>
  );
}
