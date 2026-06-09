export type SnippetKind = "heading" | "bold" | "code" | "table" | "task";

interface SnippetResult {
  content: string;
  cursor: number;
}

const blockSnippets: Record<Exclude<SnippetKind, "bold">, string> = {
  heading: "# 标题",
  code: "```ts\nconst note = '卜卜';\n```",
  table: "| 名称 | 状态 |\n| - | - |\n| 卜卜 | 开心 |",
  task: "- [ ] 待完成"
};

export function insertMarkdownSnippet(content: string, kind: SnippetKind, start: number, end: number): SnippetResult {
  const safeStart = Math.max(0, Math.min(start, content.length));
  const safeEnd = Math.max(safeStart, Math.min(end, content.length));
  const before = content.slice(0, safeStart);
  const selected = content.slice(safeStart, safeEnd);
  const after = content.slice(safeEnd);

  if (kind === "bold") {
    const text = selected || "加粗文字";
    const insertion = `**${text}**`;
    return {
      content: `${before}${insertion}${after}`,
      cursor: before.length + insertion.length
    };
  }

  const insertion = blockSnippets[kind];
  const needsLeadingBreak = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
  const needsTrailingBreak = after.length > 0 && !after.startsWith("\n") ? "\n" : "";
  const normalizedInsertion = `${needsLeadingBreak}${insertion}${needsTrailingBreak}`;

  return {
    content: `${before}${normalizedInsertion}${after}`,
    cursor: before.length + needsLeadingBreak.length + insertion.length
  };
}
