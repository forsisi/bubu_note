import { getNoteStats } from "./stats";

describe("getNoteStats", () => {
  it("counts words, lines, and reading time", () => {
    const stats = getNoteStats("Hello 卜卜\n第二行 markdown note");

    expect(stats.words).toBe(5);
    expect(stats.lines).toBe(2);
    expect(stats.readingMinutes).toBe(1);
  });

  it("handles empty content", () => {
    expect(getNoteStats("")).toEqual({ words: 0, lines: 0, readingMinutes: 0 });
  });
});
