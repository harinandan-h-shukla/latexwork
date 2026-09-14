export interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
}

/**
 * Small LCS-based line diff. Good enough for a Phase 1 mock diff view — no external diff
 * library needed for line-level, color-coded comparison of two file snapshots.
 */
export function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const n = aLines.length;
  const m = bLines.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = aLines[i] === bLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      result.push({ type: "same", text: aLines[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "removed", text: aLines[i] });
      i++;
    } else {
      result.push({ type: "added", text: bLines[j] });
      j++;
    }
  }
  while (i < n) {
    result.push({ type: "removed", text: aLines[i] });
    i++;
  }
  while (j < m) {
    result.push({ type: "added", text: bLines[j] });
    j++;
  }
  return result;
}
