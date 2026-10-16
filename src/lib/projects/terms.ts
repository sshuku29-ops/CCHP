import { listTerms } from "@/lib/dates";

/** Terms offered in the goal form: a year back to 18 months ahead (+ the goal's current term when editing). */
export function goalTermOptions(extra?: string): string[] {
  const now = new Date();
  const from = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const to = new Date(now.getFullYear() + 1, now.getMonth() + 6, 1);
  const terms = listTerms(from, to);
  if (extra && !terms.includes(extra)) terms.unshift(extra);
  return terms;
}
