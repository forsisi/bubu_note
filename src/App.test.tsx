import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import type { Note } from "./types";

const seedNotes: Note[] = [
  { id: "a", title: "Markdown 笔记", content: "# 卜卜\n\n- [x] 支持预览", tags: ["学习", "灵感"], updatedAt: 1 },
  { id: "b", title: "普通笔记", content: "搜索内容", tags: ["工作"], updatedAt: 2 }
];

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
  window.bubuNotes = {
    loadNotes: vi.fn().mockResolvedValue(seedNotes),
    saveNotes: vi.fn().mockResolvedValue(undefined),
    exportMarkdown: vi.fn().mockResolvedValue(true),
    exportJson: vi.fn().mockResolvedValue(true),
    importMarkdown: vi.fn().mockResolvedValue({ id: "c", title: "导入笔记", content: "# 导入", tags: [], updatedAt: 3 })
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("switches between edit, preview, and split markdown modes", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("button", { name: "编辑模式" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "预览模式" }));
    expect(screen.getByRole("heading", { name: "卜卜" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "同步编辑模式" }));
    expect(screen.getByLabelText("Markdown 编辑器")).toBeInTheDocument();
    expect(screen.getByLabelText("Markdown 预览")).toBeInTheDocument();
  });

  it("filters notes by title and content", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Markdown 笔记");
    await user.type(screen.getByRole("searchbox", { name: "搜索标题或内容" }), "搜索内容");

    expect(screen.queryByText("Markdown 笔记")).not.toBeInTheDocument();
    expect(screen.getByText("普通笔记")).toBeInTheDocument();
  });

  it("filters notes by tag", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "按标签筛选：工作" }));

    expect(screen.queryByText("Markdown 笔记")).not.toBeInTheDocument();
    expect(screen.getByText("普通笔记")).toBeInTheDocument();
  });

  it("shows word count, line count, and reading time", async () => {
    render(<App />);

    expect(await screen.findByText("字数 4")).toBeInTheDocument();
    expect(screen.getByText("行数 3")).toBeInTheDocument();
    expect(screen.getByText("阅读 1 分钟")).toBeInTheDocument();
  });

  it("calls import and export actions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "导出当前笔记为 Markdown" }));
    expect(window.bubuNotes!.exportMarkdown).toHaveBeenCalledWith(seedNotes[0]);

    await user.click(screen.getByRole("button", { name: "导出全部笔记为 JSON" }));
    expect(window.bubuNotes!.exportJson).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "导入 Markdown 文件" }));
    expect(await screen.findByText("导入笔记")).toBeInTheDocument();
  });

  it("handles keyboard shortcuts for new, save, search, and modes", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Markdown 笔记");
    await user.keyboard("{Control>}f{/Control}");
    expect(screen.getByRole("searchbox", { name: "搜索标题或内容" })).toHaveFocus();

    await user.keyboard("{Control>}2{/Control}");
    expect(screen.getByRole("button", { name: "预览模式" })).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Control>}n{/Control}");
    expect(screen.getAllByText("未命名笔记").length).toBeGreaterThan(0);

    await user.keyboard("{Control>}s{/Control}");
    expect(window.bubuNotes!.saveNotes).toHaveBeenCalled();
  });

  it("shows markdown syntax insertion buttons", async () => {
    render(<App />);

    expect(await screen.findByRole("button", { name: "插入标题" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入粗体" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入斜体" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入删除线" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入引用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入链接" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入图片" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入无序列表" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入有序列表" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入代码块" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入表格" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入任务列表" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "插入分割线" })).toBeInTheDocument();
  });

  it("inserts a custom sized markdown table", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "插入表格" }));
    expect(screen.getByRole("dialog", { name: "插入自定义表格" })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("行数"));
    await user.type(screen.getByLabelText("行数"), "3");
    await user.clear(screen.getByLabelText("列数"));
    await user.type(screen.getByLabelText("列数"), "4");
    await user.click(screen.getByRole("button", { name: "插入 3×4 表格" }));

    expect(window.bubuNotes!.saveNotes).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        content: expect.stringContaining("| 列 1 | 列 2 | 列 3 | 列 4 |")
      })
    ]));
  });

  it("shows WebDAV login controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByLabelText("WebDAV 多端同步")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "登录" }));

    expect(screen.getByRole("dialog", { name: "WebDAV 登录设置" })).toBeInTheDocument();
    expect(screen.getByLabelText("WebDAV 地址")).toBeInTheDocument();
    expect(screen.getByLabelText("同步文件路径")).toHaveValue("/bubu-notes/notes.json");
  });

  it("shows a save failure when persistence fails", async () => {
    const user = userEvent.setup();
    window.bubuNotes!.saveNotes = vi.fn().mockRejectedValue(new Error("disk full"));
    render(<App />);

    await user.type(await screen.findByRole("textbox", { name: "笔记标题" }), "失败");

    expect(await screen.findByText("保存失败")).toBeInTheDocument();
  });

  it("shows separate scroll regions for notes and editor", async () => {
    render(<App />);

    expect(await screen.findByTestId("note-scroll-region")).toHaveClass("note-list");
    expect(screen.getByTestId("editor-scroll-region")).toHaveClass("editor-workspace");
  });

  it("opens and closes the markdown syntax tutorial", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Markdown 语法教程" }));

    expect(screen.getByRole("dialog", { name: "Markdown 常用语法教程" })).toBeInTheDocument();
    expect(screen.getByText("标题")).toBeInTheDocument();
    expect(screen.getByText("# 一级标题")).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes("- [x] 已完成"))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "关闭教程" }));

    expect(screen.queryByRole("dialog", { name: "Markdown 常用语法教程" })).not.toBeInTheDocument();
  });
});
