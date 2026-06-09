export type SnippetKind =
  | "heading"
  | "bold"
  | "italic"
  | "strikethrough"
  | "quote"
  | "code"
  | "link"
  | "image"
  | "unorderedList"
  | "orderedList"
  | "table"
  | "task"
  | "divider";

interface SnippetResult {
  content: string;
  cursor: number;
}

const blockSnippets: Partial<Record<SnippetKind, string>> = {
  heading: "# 标题",
  quote: "> 引用内容",
  code: "```ts\nconst note = '卜卜';\n```",
  link: "[链接文字](https://example.com)",
  image: "![图片描述](https://example.com/image.png)",
  unorderedList: "- 列表项",
  orderedList: "1. 列表项",
  table: createMarkdownTable(2, 2, ["名称", "状态"], [["卜卜", "开心"]]),
  task: "- [ ] 待完成",
  divider: "---"
};

export function createMarkdownTable(rows: number, columns: number, headers?: string[], body?: string[][]): string {
  const safeRows = Math.max(1, Math.min(20, Math.floor(rows) || 1));
  const safeColumns = Math.max(1, Math.min(10, Math.floor(columns) || 1));
  const headerCells = Array.from({ length: safeColumns }, (_, index) => headers?.[index] ?? `列 ${index + 1}`);
  const separatorCells = Array.from({ length: safeColumns }, () => "-");
  const bodyRows = Array.from({ length: safeRows }, (_, rowIndex) =>
    Array.from({ length: safeColumns }, (_, columnIndex) => body?.[rowIndex]?.[columnIndex] ?? "")
  );

  return [
    formatTableRow(headerCells),
    formatTableRow(separatorCells),
    ...bodyRows.map(formatTableRow)
  ].join("\n");
}

function formatTableRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function inlineSnippet(before: string, selected: string, after: string, fallback: string, prefix: string, suffix = prefix): SnippetResult {
  const text = selected || fallback;
  const insertion = `${prefix}${text}${suffix}`;

  return {
    content: `${before}${insertion}${after}`,
    cursor: before.length + insertion.length
  };
}

export function insertMarkdownSnippet(content: string, kind: SnippetKind, start: number, end: number): SnippetResult {
  const safeStart = Math.max(0, Math.min(start, content.length));
  const safeEnd = Math.max(safeStart, Math.min(end, content.length));
  const before = content.slice(0, safeStart);
  const selected = content.slice(safeStart, safeEnd);
  const after = content.slice(safeEnd);

  if (kind === "bold") {
    return inlineSnippet(before, selected, after, "加粗文字", "**");
  }

  if (kind === "italic") {
    return inlineSnippet(before, selected, after, "斜体文字", "*");
  }

  if (kind === "strikethrough") {
    return inlineSnippet(before, selected, after, "删除线文字", "~~");
  }

  const insertion = blockSnippets[kind];
  if (!insertion) {
    return { content, cursor: safeEnd };
  }

  const needsLeadingBreak = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
  const needsTrailingBreak = after.length > 0 && !after.startsWith("\n") ? "\n" : "";
  const normalizedInsertion = `${needsLeadingBreak}${insertion}${needsTrailingBreak}`;

  return {
    content: `${before}${normalizedInsertion}${after}`,
    cursor: before.length + needsLeadingBreak.length + insertion.length
  };
}
