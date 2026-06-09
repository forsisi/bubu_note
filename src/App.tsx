import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import logoUrl from "../assets/bubu-logo.svg";
import { createBrowserNotesApi } from "./lib/browserFileApi";
import { renderMarkdown } from "./lib/markdown";
import { createNote, deleteNote, filterNotes, updateNote } from "./lib/notes";
import { insertMarkdownSnippet, type SnippetKind } from "./lib/snippets";
import { getNoteStats } from "./lib/stats";
import type { EditorMode, Note } from "./types";

const modeLabels: Record<EditorMode, string> = {
  edit: "编辑模式",
  preview: "预览模式",
  split: "同步编辑模式"
};

const markdownTutorial = [
  { title: "标题", syntax: "# 一级标题", note: "用 # 到 ###### 表示不同层级标题。" },
  { title: "强调", syntax: "**加粗**  *斜体*", note: "用星号包住文字，突出重点。" },
  { title: "列表", syntax: "- 无序列表\n1. 有序列表", note: "短横线和数字都可以组织条目。" },
  { title: "任务", syntax: "- [x] 已完成\n- [ ] 待完成", note: "适合做待办清单。" },
  { title: "引用", syntax: "> 引用一段话", note: "用于摘录、灵感或提醒。" },
  { title: "代码", syntax: "```ts\nconst note = '卜卜';\n```", note: "代码块会自动高亮。" },
  { title: "链接", syntax: "[标题](https://example.com)", note: "链接文字放在方括号里。" },
  { title: "表格", syntax: "| 名称 | 状态 |\n| - | - |\n| 卜卜 | 开心 |", note: "用竖线分隔列。" }
];

const fallbackApi = createBrowserNotesApi();

function getApi() {
  return window.bubuNotes ?? fallbackApi;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [mode, setMode] = useState<EditorMode>("edit");
  const [saveStatus, setSaveStatus] = useState("正在载入");
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  const activeNote = useMemo(() => notes.find((note) => note.id === activeId) ?? notes[0], [activeId, notes]);
  const filteredNotes = useMemo(() => filterNotes(notes, searchQuery, activeTag), [activeTag, notes, searchQuery]);
  const allTags = useMemo(() => Array.from(new Set(notes.flatMap((note) => note.tags))).sort((a, b) => a.localeCompare(b, "zh-CN")), [notes]);
  const renderedHtml = useMemo(() => renderMarkdown(activeNote?.content ?? ""), [activeNote?.content]);
  const stats = useMemo(() => getNoteStats(activeNote?.content ?? ""), [activeNote?.content]);

  const persistNotes = useCallback(async (nextNotes: Note[]) => {
    setNotes(nextNotes);
    try {
      await getApi().saveNotes(nextNotes);
      setSaveStatus(`已自动保存 ${formatTime(Date.now())}`);
    } catch {
      setSaveStatus("保存失败");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getApi().loadNotes().then((loadedNotes) => {
      if (cancelled) return;
      const nextNotes = loadedNotes.length > 0 ? loadedNotes : [createNote()];
      setNotes(nextNotes);
      setActiveId(nextNotes[0].id);
      setSaveStatus("已保存");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleCreateNote() {
    const note = createNote();
    const nextNotes = [note, ...notes];
    setSearchQuery("");
    setActiveTag("");
    setActiveId(note.id);
    void persistNotes(nextNotes);
  }

  function handleDeleteNote() {
    if (!activeNote) return;
    const result = deleteNote(notes, activeNote.id);
    setActiveId(result.nextActiveId);
    void persistNotes(result.notes);
  }

  function handleUpdateNote(changes: Partial<Pick<Note, "title" | "content" | "tags">>) {
    if (!activeNote) return;
    const nextNotes = updateNote(notes, activeNote.id, changes);
    setActiveId(activeNote.id);
    void persistNotes(nextNotes);
  }

  function handleSearch(nextQuery: string) {
    setSearchQuery(nextQuery);
    const nextFilteredNotes = filterNotes(notes, nextQuery, activeTag);
    if (nextFilteredNotes.length > 0 && !nextFilteredNotes.some((note) => note.id === activeId)) {
      setActiveId(nextFilteredNotes[0].id);
    }
  }

  function handleTagFilter(nextTag: string) {
    setActiveTag(nextTag);
    const nextFilteredNotes = filterNotes(notes, searchQuery, nextTag);
    if (nextFilteredNotes.length > 0 && !nextFilteredNotes.some((note) => note.id === activeId)) {
      setActiveId(nextFilteredNotes[0].id);
    }
  }

  function handleTagsChange(value: string) {
    const tags = Array.from(new Set(value.split(/[,，\s]+/).map((tag) => tag.trim()).filter(Boolean)));
    handleUpdateNote({ tags });
  }

  async function handleManualSave() {
    try {
      await getApi().saveNotes(notes);
      setSaveStatus(`已保存 ${formatTime(Date.now())}`);
    } catch {
      setSaveStatus("保存失败");
    }
  }

  async function handleExportMarkdown() {
    if (!activeNote) return;
    try {
      const exported = await getApi().exportMarkdown(activeNote);
      setSaveStatus(exported ? "已导出 Markdown" : "已取消导出");
    } catch {
      setSaveStatus("导出失败");
    }
  }

  async function handleExportJson() {
    try {
      const exported = await getApi().exportJson(notes);
      setSaveStatus(exported ? "已导出 JSON" : "已取消导出");
    } catch {
      setSaveStatus("导出失败");
    }
  }

  async function handleImportMarkdown() {
    let imported: Note | null = null;
    try {
      imported = await getApi().importMarkdown();
    } catch {
      setSaveStatus("导入失败");
      return;
    }
    if (!imported) {
      setSaveStatus("已取消导入");
      return;
    }
    const nextNotes = [imported, ...notes];
    setSearchQuery("");
    setActiveTag("");
    setActiveId(imported.id);
    await persistNotes(nextNotes);
  }

  function handleInsertSnippet(kind: SnippetKind) {
    if (!activeNote) return;

    const view = editorRef.current?.view;
    const selection = view?.state.selection.main;
    const start = selection?.from ?? activeNote.content.length;
    const end = selection?.to ?? activeNote.content.length;
    const result = insertMarkdownSnippet(activeNote.content, kind, start, end);
    handleUpdateNote({ content: result.content });

    window.requestAnimationFrame(() => {
      const nextView = editorRef.current?.view;
      nextView?.focus();
      nextView?.dispatch({ selection: { anchor: result.cursor } });
    });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey && !event.metaKey) return;

      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        handleCreateNote();
      } else if (key === "s") {
        event.preventDefault();
        void handleManualSave();
      } else if (key === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (key === "1") {
        event.preventDefault();
        setMode("edit");
      } else if (key === "2") {
        event.preventDefault();
        setMode("preview");
      } else if (key === "3") {
        event.preventDefault();
        setMode("split");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeNote, notes]);

  function syncScroll(source: "editor" | "preview") {
    if (mode !== "split" || syncingRef.current) return;

    const editorScroll = editorRef.current?.view?.scrollDOM;
    const previewScroll = previewRef.current;
    if (!editorScroll || !previewScroll) return;

    const sourceElement = source === "editor" ? editorScroll : previewScroll;
    const targetElement = source === "editor" ? previewScroll : editorScroll;
    const maxSource = sourceElement.scrollHeight - sourceElement.clientHeight;
    const maxTarget = targetElement.scrollHeight - targetElement.clientHeight;
    if (maxSource <= 0 || maxTarget <= 0) return;

    syncingRef.current = true;
    targetElement.scrollTop = (sourceElement.scrollTop / maxSource) * maxTarget;
    window.requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }

  const editorExtensions = useMemo(() => [
    markdown({ base: markdownLanguage }),
    EditorView.lineWrapping
  ], []);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="笔记菜单">
        <div className="sidebar-header">
          <div className="brand-lockup">
            <span className="logo-mark" role="img" aria-label="卜卜笔记胡萝卜 logo">
              <img src={logoUrl} alt="" />
            </span>
            <div className="brand">
              <h1>卜卜笔记</h1>
              <p>可爱地记录每一个想法</p>
            </div>
          </div>
          <button className="icon-button" type="button" title="新建笔记" aria-label="新建笔记" onClick={handleCreateNote}>+</button>
        </div>

        <label className="search-wrap">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M16.5 16.5L21 21" />
          </svg>
          <input
            ref={searchInputRef}
            className="search-input"
            type="search"
            value={searchQuery}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="搜索标题或内容"
            aria-label="搜索标题或内容"
          />
        </label>

        <div className="tag-filter" aria-label="标签筛选">
          <button
            className={`tag-button${activeTag === "" ? " active" : ""}`}
            type="button"
            aria-label="按标签筛选：全部"
            aria-pressed={activeTag === ""}
            onClick={() => handleTagFilter("")}
          >
            全部
          </button>
          {allTags.map((tag) => (
            <button
              className={`tag-button${activeTag === tag ? " active" : ""}`}
              type="button"
              key={tag}
              aria-label={`按标签筛选：${tag}`}
              aria-pressed={activeTag === tag}
              onClick={() => handleTagFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="note-list" data-testid="note-scroll-region">
          {filteredNotes.length === 0 ? (
            <div className="empty-list">没有找到匹配的笔记。</div>
          ) : (
            filteredNotes.map((note) => (
              <button
                className={`note-item${note.id === activeNote?.id ? " active" : ""}`}
                key={note.id}
                type="button"
                onClick={() => setActiveId(note.id)}
              >
                <span className="note-title">{note.title.trim() || "未命名笔记"}</span>
                <span className="note-preview">{note.content.trim() || "暂无内容"}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="editor" aria-label="笔记编辑器">
        <div className="editor-toolbar">
          <span className="status">{saveStatus}</span>
          <div className="toolbar-actions">
            <div className="mode-switch" aria-label="Markdown 模式切换">
              {(Object.keys(modeLabels) as EditorMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={mode === item ? "active" : ""}
                  aria-label={modeLabels[item]}
                  aria-pressed={mode === item}
                  onClick={() => setMode(item)}
                >
                  {modeLabels[item].replace("模式", "")}
                </button>
              ))}
            </div>
            <button
              className="tutorial-button"
              type="button"
              title="Markdown 语法教程"
              aria-label="Markdown 语法教程"
              onClick={() => setIsTutorialOpen(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.8 9.5a2.4 2.4 0 0 1 4.6.9c0 1.8-2.4 2.1-2.4 3.8" />
                <path d="M12 17.6h.01" />
              </svg>
            </button>
            <div className="syntax-toolbar" aria-label="插入 Markdown 语法">
              <button type="button" title="插入标题" aria-label="插入标题" onClick={() => handleInsertSnippet("heading")}>#</button>
              <button type="button" title="插入粗体" aria-label="插入粗体" onClick={() => handleInsertSnippet("bold")}>B</button>
              <button type="button" title="插入代码块" aria-label="插入代码块" onClick={() => handleInsertSnippet("code")}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 9l-4 3 4 3" />
                  <path d="M16 9l4 3-4 3" />
                  <path d="M13 5l-2 14" />
                </svg>
              </button>
              <button type="button" title="插入表格" aria-label="插入表格" onClick={() => handleInsertSnippet("table")}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5h16v14H4z" />
                  <path d="M4 10h16" />
                  <path d="M4 15h16" />
                  <path d="M10 5v14" />
                  <path d="M16 5v14" />
                </svg>
              </button>
              <button type="button" title="插入任务列表" aria-label="插入任务列表" onClick={() => handleInsertSnippet("task")}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 6h4v4H5z" />
                  <path d="M12 8h7" />
                  <path d="M6 17l2 2 4-5" />
                  <path d="M14 17h5" />
                </svg>
              </button>
            </div>
            <div className="io-actions" aria-label="导入导出">
              <button type="button" title="导出当前笔记为 Markdown" aria-label="导出当前笔记为 Markdown" onClick={handleExportMarkdown}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 4v11" />
                  <path d="M8 11l4 4 4-4" />
                  <path d="M5 20h14" />
                </svg>
              </button>
              <button type="button" title="导出全部笔记为 JSON" aria-label="导出全部笔记为 JSON" onClick={handleExportJson}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 4h7l4 4v12H7z" />
                  <path d="M14 4v5h4" />
                  <path d="M10 13h5" />
                  <path d="M10 17h5" />
                </svg>
              </button>
              <button type="button" title="导入 Markdown 文件" aria-label="导入 Markdown 文件" onClick={handleImportMarkdown}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20V9" />
                  <path d="M8 13l4-4 4 4" />
                  <path d="M5 4h14" />
                </svg>
              </button>
            </div>
            <button
              className="danger-button"
              type="button"
              title={notes.length <= 1 ? "至少保留一条笔记" : "删除当前笔记"}
              aria-label="删除当前笔记"
              disabled={notes.length <= 1}
              onClick={handleDeleteNote}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="editor-body">
          <input
            className="title-input"
            type="text"
            value={activeNote?.title ?? ""}
            onChange={(event) => handleUpdateNote({ title: event.target.value })}
            placeholder="给这颗灵感取个名字"
            aria-label="笔记标题"
          />

          <div className="note-meta-row">
            <label className="tag-input-wrap">
              <span>标签</span>
              <input
                className="tag-input"
                type="text"
                value={activeNote?.tags.join("，") ?? ""}
                onChange={(event) => handleTagsChange(event.target.value)}
                placeholder="学习，灵感，工作"
                aria-label="笔记标签"
              />
            </label>
            <div className="editor-meta" aria-label="字数统计">
              <span>字数 {stats.words}</span>
              <span>行数 {stats.lines}</span>
              <span>阅读 {stats.readingMinutes} 分钟</span>
            </div>
          </div>

          <div className={`editor-workspace mode-${mode}`} data-testid="editor-scroll-region">
            {(mode === "edit" || mode === "split") && (
              <CodeMirror
                ref={editorRef}
                className="markdown-editor"
                value={activeNote?.content ?? ""}
                height="100%"
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  highlightActiveLine: true
                }}
                extensions={editorExtensions}
                onChange={(value) => handleUpdateNote({ content: value })}
                onUpdate={() => syncScroll("editor")}
                aria-label="Markdown 编辑器"
              />
            )}

            {(mode === "preview" || mode === "split") && (
              <div
                ref={previewRef}
                className="markdown-preview"
                aria-label="Markdown 预览"
                onScroll={() => syncScroll("preview")}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            )}
          </div>
        </div>
      </section>

      {isTutorialOpen && (
        <div className="tutorial-overlay" role="presentation" onMouseDown={() => setIsTutorialOpen(false)}>
          <section
            className="tutorial-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Markdown 常用语法教程"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="tutorial-header">
              <div>
                <h2>Markdown 常用语法教程</h2>
                <p>写笔记时可以直接照着这些格式输入。</p>
              </div>
              <button className="tutorial-close" type="button" aria-label="关闭教程" onClick={() => setIsTutorialOpen(false)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="tutorial-grid">
              {markdownTutorial.map((item) => (
                <article className="tutorial-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <pre><code>{item.syntax}</code></pre>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
