export interface SearchFlags {
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildSearchRegExp(query: string, flags: SearchFlags): RegExp | null {
  if (!query) return null;
  let pattern = flags.regex ? query : escapeRegExp(query);
  if (flags.wholeWord) pattern = `\\b${pattern}\\b`;
  try {
    return new RegExp(pattern, flags.caseSensitive ? "g" : "gi");
  } catch {
    return null;
  }
}

export interface FileMatch {
  line: number;
  column: number;
  preview: string;
  matchLength: number;
}

export function findMatchesInContent(content: string, regex: RegExp): FileMatch[] {
  const matches: FileMatch[] = [];
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    const lineRegex = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;
    while ((match = lineRegex.exec(line)) !== null) {
      matches.push({
        line: idx + 1,
        column: match.index,
        preview: line.trim().slice(0, 160),
        matchLength: match[0].length || 1,
      });
      if (match[0].length === 0) lineRegex.lastIndex++;
    }
  });
  return matches;
}

export function replaceAllInContent(content: string, regex: RegExp, replacement: string): string {
  return content.replace(new RegExp(regex.source, regex.flags), replacement);
}
