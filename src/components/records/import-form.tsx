"use client";

import { useActionState } from "react";
import { importCsvAction, type ImportActionState } from "@/lib/records/actions";
import type { ImportKind } from "@/lib/records/import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * One upload form per importer. The server action returns a results summary
 * (inserted / skipped with reasons) which is rendered right under the form.
 */
export function ImportForm({ kind, sampleHeader }: { kind: ImportKind; sampleHeader: string }) {
  const [state, action, pending] = useActionState<ImportActionState, FormData>(importCsvAction, null);
  const result = state?.result;
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="kind" value={kind} />
        <div className="space-y-1.5">
          <Label htmlFor={`file-${kind}`}>CSV file (max 2 MB)</Label>
          <Input id={`file-${kind}`} name="file" type="file" accept=".csv,text/csv" required />
          <p className="text-xs text-muted-foreground">
            First line must be exactly: <code className="rounded bg-muted px-1">{sampleHeader}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input id={`dry-${kind}`} name="dryRun" type="checkbox" className="size-4 accent-primary" defaultChecked />
          <Label htmlFor={`dry-${kind}`}>Dry run — check the file without saving anything</Label>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Checking…" : "Upload and run"}
        </Button>
      </form>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not import</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <Alert>
            <AlertTitle>{result.dryRun ? "Dry run finished — nothing was saved" : "Import finished"}</AlertTitle>
            <AlertDescription>
              {result.totalRows} data row{result.totalRows === 1 ? "" : "s"} read · {result.inserted}{" "}
              {result.dryRun ? "would be added" : "added"} · {result.skipped.length} skipped.
              {result.dryRun && result.inserted > 0 ? " Untick “Dry run” and upload again to save." : ""}
            </AlertDescription>
          </Alert>

          {result.created && result.created.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {result.dryRun ? "Accounts that would be created" : "Accounts created — temporary passwords are shown ONCE"}
              </p>
              {!result.dryRun ? (
                <p className="text-xs text-muted-foreground">
                  Copy these now and pass each one to its volunteer privately. They must change it at first sign-in.
                </p>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Temporary password</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.created.map((c) => (
                    <TableRow key={c.row}>
                      <TableCell>{c.row}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell className="font-mono text-xs">{c.username}</TableCell>
                      <TableCell className="font-mono text-xs">{c.tempPassword}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {result.skipped.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Skipped rows</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Row</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.skipped.map((s) => (
                    <TableRow key={s.row}>
                      <TableCell>{s.row}</TableCell>
                      <TableCell>{s.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
