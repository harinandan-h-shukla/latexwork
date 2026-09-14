import type { BibEntryType } from "@/lib/types";

export const BIB_TYPES: BibEntryType[] = [
  "article",
  "book",
  "inproceedings",
  "misc",
  "phdthesis",
  "techreport",
];

export const BIB_TYPE_LABELS: Record<BibEntryType, string> = {
  article: "Article",
  book: "Book",
  inproceedings: "Conference paper",
  misc: "Misc",
  phdthesis: "PhD thesis",
  techreport: "Technical report",
};

export const BIB_TYPE_FIELDS: Record<BibEntryType, string[]> = {
  article: ["author", "title", "journal", "year", "volume", "number", "pages", "doi"],
  book: ["author", "title", "publisher", "year", "address", "isbn"],
  inproceedings: ["author", "title", "booktitle", "year", "pages", "organization"],
  misc: ["author", "title", "year", "howpublished", "note", "url"],
  phdthesis: ["author", "title", "school", "year"],
  techreport: ["author", "title", "institution", "year", "number"],
};

export function getVenue(fields: Record<string, string>): string {
  return (
    fields.journal ||
    fields.booktitle ||
    fields.publisher ||
    fields.school ||
    fields.institution ||
    fields.howpublished ||
    ""
  );
}

interface MinimalEntry {
  key: string;
  type: BibEntryType;
  fields: Record<string, string>;
}

export function formatBibEntry(entry: MinimalEntry): string {
  const order = BIB_TYPE_FIELDS[entry.type] ?? [];
  const known = order.filter((field) => entry.fields[field]);
  const extra = Object.keys(entry.fields).filter(
    (field) => !order.includes(field) && entry.fields[field]
  );
  const lines = [...known, ...extra].map(
    (field) => `  ${field} = {${entry.fields[field]}}`
  );
  return `@${entry.type}{${entry.key},\n${lines.join(",\n")}\n}`;
}

export function formatBibEntries(entries: MinimalEntry[]): string {
  return entries.map(formatBibEntry).join("\n\n");
}

export interface ParsedBibEntry {
  key: string;
  type: BibEntryType;
  fields: Record<string, string>;
}

export function parseBibEntries(raw: string): ParsedBibEntry[] {
  const results: ParsedBibEntry[] = [];
  let i = 0;

  while (i < raw.length) {
    const at = raw.indexOf("@", i);
    if (at === -1) break;
    const braceStart = raw.indexOf("{", at);
    if (braceStart === -1) break;

    const typeRaw = raw.slice(at + 1, braceStart).trim().toLowerCase();

    let depth = 1;
    let j = braceStart + 1;
    while (j < raw.length && depth > 0) {
      if (raw[j] === "{") depth++;
      else if (raw[j] === "}") depth--;
      j++;
    }
    const body = raw.slice(braceStart + 1, j - 1);
    i = j;

    const commaIdx = body.indexOf(",");
    const key = (commaIdx === -1 ? body : body.slice(0, commaIdx)).trim();
    if (!key) continue;

    const fieldsRaw = commaIdx === -1 ? "" : body.slice(commaIdx + 1);
    const segments: string[] = [];
    let fdepth = 0;
    let segStart = 0;
    for (let k = 0; k < fieldsRaw.length; k++) {
      const ch = fieldsRaw[k];
      if (ch === "{") fdepth++;
      else if (ch === "}") fdepth--;
      else if (ch === "," && fdepth === 0) {
        segments.push(fieldsRaw.slice(segStart, k));
        segStart = k + 1;
      }
    }
    segments.push(fieldsRaw.slice(segStart));

    const fields: Record<string, string> = {};
    for (const seg of segments) {
      const eq = seg.indexOf("=");
      if (eq === -1) continue;
      const fname = seg.slice(0, eq).trim().toLowerCase();
      let fval = seg.slice(eq + 1).trim();
      fval = fval.replace(/^\{|\}$/g, "");
      fval = fval.replace(/^"|"$/g, "");
      fval = fval.replace(/,$/, "").trim();
      if (fname) fields[fname] = fval;
    }

    const type = (BIB_TYPES.includes(typeRaw as BibEntryType) ? typeRaw : "misc") as BibEntryType;
    results.push({ key, type, fields });
  }

  return results;
}

export type BibStyle = "plain" | "ieeetr" | "apalike";

export const BIB_STYLES: Array<{ id: BibStyle; label: string }> = [
  { id: "plain", label: "plain" },
  { id: "ieeetr", label: "ieeetr" },
  { id: "apalike", label: "apalike" },
];

export function formatEntryForStyle(entry: MinimalEntry, style: BibStyle, index = 1): string {
  const { fields } = entry;
  const author = fields.author || "Unknown Author";
  const title = fields.title || "Untitled";
  const venue = getVenue(fields);
  const year = fields.year || "n.d.";

  switch (style) {
    case "ieeetr":
      return `[${index}] ${author}, "${title},"${venue ? ` ${venue},` : ""} ${year}.`;
    case "apalike":
      return `${author} (${year}). ${title}.${venue ? ` ${venue}.` : ""}`;
    case "plain":
    default:
      return `${author}. ${title}.${venue ? ` ${venue},` : ""} ${year}.`;
  }
}

export function generateCitationKey(
  authors: string,
  year: string,
  existingKeys: string[]
): string {
  const firstAuthorLast =
    authors
      .split(/,| and /i)[0]
      ?.trim()
      .split(" ")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z]/g, "") || "ref";
  const base = `${firstAuthorLast}${year || ""}`.trim() || `ref${Math.random().toString(36).slice(2, 6)}`;

  const lowerExisting = existingKeys.map((k) => k.toLowerCase());
  if (!lowerExisting.includes(base.toLowerCase())) return base;

  let suffix = 1;
  let candidate = `${base}${String.fromCharCode(96 + suffix)}`;
  while (lowerExisting.includes(candidate.toLowerCase())) {
    suffix++;
    candidate = `${base}${String.fromCharCode(96 + suffix)}`;
  }
  return candidate;
}

export function nextAvailableKey(base: string, existingKeys: string[]): string {
  const lower = existingKeys.map((k) => k.toLowerCase());
  let n = 2;
  let candidate = `${base}-${n}`;
  while (lower.includes(candidate.toLowerCase())) {
    n++;
    candidate = `${base}-${n}`;
  }
  return candidate;
}
