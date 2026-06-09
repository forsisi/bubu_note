import DOMPurify from "dompurify";
import hljs from "highlight.js";
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";

const markdown: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(code: string, language: string): string {
    if (language && hljs.getLanguage(language)) {
      const highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    }

    const escaped: string = markdown.utils.escapeHtml(code);
    return `<pre><code class="hljs">${escaped}</code></pre>`;
  }
}).use(taskLists, { enabled: true, label: true });

export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(markdown.render(source), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel", "class"]
  });
}
