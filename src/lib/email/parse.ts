/**
 * Source-faithful HTML scanner. Unlike a browser parser it does not repair
 * markup, so we can report missing/stray tags with exact line numbers.
 */
export interface Attr { name: string; value: string | null }
export interface TagToken {
  kind: "open" | "close";
  name: string; // lower-cased
  rawName: string;
  attrs: Attr[];
  selfClosing: boolean;
  start: number;
  end: number;
  line: number;
  column: number;
}
export interface CommentToken { kind: "comment"; text: string; start: number; end: number; line: number }
export interface RawTextBlock { tag: "style" | "script"; content: string; start: number; line: number; attrs: Attr[] }

export interface ScanResult {
  tags: TagToken[];
  comments: CommentToken[];
  styles: RawTextBlock[];
  scripts: RawTextBlock[];
  hasDoctype: boolean;
  lineOf(index: number): { line: number; column: number };
  source: string;
}

export const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr", "keygen", "command"]);

const ATTR_RE = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

export function makeLineIndex(source: string) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source.charCodeAt(i) === 10) starts.push(i + 1);
  return (index: number) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid; else hi = mid - 1;
    }
    return { line: lo + 1, column: index - starts[lo] + 1 };
  };
}

function parseAttrs(raw: string): Attr[] {
  const attrs: Attr[] = [];
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(raw))) {
    attrs.push({ name: m[1].toLowerCase(), value: m[2] ?? m[3] ?? m[4] ?? null });
  }
  return attrs;
}

export function scanHtml(source: string): ScanResult {
  const lineOf = makeLineIndex(source);
  const tags: TagToken[] = [];
  const comments: CommentToken[] = [];
  const styles: RawTextBlock[] = [];
  const scripts: RawTextBlock[] = [];
  const hasDoctype = /^\s*(?:<!--[\s\S]*?-->\s*)*<!doctype\s+html/i.test(source);

  let i = 0;
  const len = source.length;
  while (i < len) {
    const lt = source.indexOf("<", i);
    if (lt === -1) break;
    if (source.startsWith("<!--", lt)) {
      const endIdx = source.indexOf("-->", lt + 4);
      const end = endIdx === -1 ? len : endIdx + 3;
      comments.push({ kind: "comment", text: source.slice(lt, end), start: lt, end, line: lineOf(lt).line });
      i = end;
      continue;
    }
    if (source.startsWith("<!", lt) || source.startsWith("<?", lt)) {
      const gt = source.indexOf(">", lt);
      i = gt === -1 ? len : gt + 1;
      continue;
    }
    const m = /^<(\/?)([a-zA-Z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/.exec(source.slice(lt, Math.min(len, lt + 20000)));
    if (!m) {
      i = lt + 1;
      continue;
    }
    const end = lt + m[0].length;
    const name = m[2].toLowerCase();
    const pos = lineOf(lt);
    const token: TagToken = {
      kind: m[1] ? "close" : "open",
      name,
      rawName: m[2],
      attrs: m[1] ? [] : parseAttrs(m[3]),
      selfClosing: m[4] === "/",
      start: lt,
      end,
      line: pos.line,
      column: pos.column,
    };
    tags.push(token);
    i = end;
    if (token.kind === "open" && (name === "style" || name === "script") && !token.selfClosing) {
      const closeRe = new RegExp(`</${name}\\s*>`, "ig");
      closeRe.lastIndex = end;
      const close = closeRe.exec(source);
      const contentEnd = close ? close.index : len;
      (name === "style" ? styles : scripts).push({ tag: name, content: source.slice(end, contentEnd), start: end, line: pos.line, attrs: token.attrs });
      if (close) {
        const cpos = lineOf(close.index);
        tags.push({ kind: "close", name, rawName: name, attrs: [], selfClosing: false, start: close.index, end: close.index + close[0].length, line: cpos.line, column: cpos.column });
        i = close.index + close[0].length;
      } else i = len;
    }
  }
  return { tags, comments, styles, scripts, hasDoctype, lineOf, source };
}

export function attr(tag: TagToken, name: string): string | null | undefined {
  return tag.attrs.find((a) => a.name === name)?.value;
}
export function hasAttr(tag: TagToken, name: string): boolean {
  return tag.attrs.some((a) => a.name === name);
}
export function lineText(source: string, line: number): string {
  return source.split("\n")[line - 1] ?? "";
}
