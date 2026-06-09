export interface NoteStats {
  words: number;
  lines: number;
  readingMinutes: number;
}

export function getNoteStats(content: string): NoteStats {
  const trimmed = content.trim();
  if (!trimmed) {
    return { words: 0, lines: 0, readingMinutes: 0 };
  }

  const lines = content.split(/\r?\n/).length;
  const tokens = trimmed.match(/[A-Za-z0-9_]+|[\u4e00-\u9fff]+/g) ?? [];
  const taskMarkers = trimmed.match(/-\s+\[[ xX]\]/g) ?? [];
  const words = tokens.length + taskMarkers.length;

  return {
    words,
    lines,
    readingMinutes: Math.max(1, Math.ceil(words / 200))
  };
}
