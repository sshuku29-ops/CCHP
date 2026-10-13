"use client";

import { useState } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { FieldError } from "@/components/shared/field-error";
import { Markdown } from "@/components/shared/markdown";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveReportAction } from "@/lib/reports/actions";

type Quote = { text: string; attribution: string };

/** Narrative fields of an annual report. Metrics are computed, not typed in. */
export function ReportForm({
  report,
}: {
  report: { year: number; title: string; summary: string | null; narrative: string | null; highlightsList: string[]; quotesList: Quote[] };
}) {
  const [narrative, setNarrative] = useState(report.narrative ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>(report.quotesList.length ? report.quotesList : [{ text: "", attribution: "" }]);

  return (
    <ActionForm action={saveReportAction} successMessage="Draft saved." className="space-y-6">
      {(state) => (
        <>
          <input type="hidden" name="year" value={report.year} />
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={report.title} required maxLength={200} />
            <FieldError msg={state?.fieldErrors?.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="summary">Summary (one or two sentences)</Label>
            <Textarea id="summary" name="summary" defaultValue={report.summary ?? ""} rows={2} maxLength={2000} />
            <FieldError msg={state?.fieldErrors?.summary} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="narrative">Narrative (markdown)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "Hide preview" : "Show preview"}
              </Button>
            </div>
            <Textarea id="narrative" name="narrative" value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={12} />
            <p className="text-xs text-muted-foreground">Use ## for section headings, - for bullet lists, **bold**.</p>
            <FieldError msg={state?.fieldErrors?.narrative} />
            {showPreview ? (
              <div className="rounded-lg border bg-muted/30 p-4">
                {narrative.trim() ? <Markdown source={narrative} /> : <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="highlights">Highlights (one per line)</Label>
            <Textarea id="highlights" name="highlights" defaultValue={report.highlightsList.join("\n")} rows={4} />
            <FieldError msg={state?.fieldErrors?.highlights} />
          </div>

          <div className="space-y-2">
            <Label>Quotes</Label>
            <p className="text-xs text-muted-foreground">
              Attribution must never identify a shelter resident. Use a generic label such as “Session participant” or “Volunteer”.
            </p>
            {quotes.map((q, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <Textarea
                  name="quote_text"
                  placeholder="Quote text"
                  value={q.text}
                  rows={2}
                  maxLength={1000}
                  onChange={(e) => setQuotes((prev) => prev.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    name="quote_attribution"
                    placeholder="Attribution, e.g. Session participant"
                    value={q.attribution}
                    maxLength={120}
                    onChange={(e) => setQuotes((prev) => prev.map((x, j) => (j === i ? { ...x, attribution: e.target.value } : x)))}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setQuotes((prev) => prev.filter((_, j) => j !== i))}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setQuotes((prev) => [...prev, { text: "", attribution: "" }])}>
              Add quote
            </Button>
          </div>

          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton>Save draft</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
