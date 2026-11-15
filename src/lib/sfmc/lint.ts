import { makeLineIndex } from "@/lib/email/parse";
import type { Issue } from "@/lib/email/types";
import { AMPSCRIPT_FUNCTIONS } from "./monaco-languages";

export type AmpDraft = Omit<Issue, "id" | "source">;

const KNOWN = new Set(AMPSCRIPT_FUNCTIONS.map((f) => f.toLowerCase()));
const KEYWORDS = new Set(["var", "set", "if", "elseif", "else", "endif", "for", "to", "downto", "next", "do", "then", "and", "or", "not"]);

export interface AmpCode {
  kind: "block" | "inline" | "script";
  start: number; // index of the code body in the source
  code: string;
  closed: boolean;
}

/** Finds %%[ ]%% blocks, %%= =%% inline expressions and server-side AMPscript <script> tags. */
export function findAmpscript(source: string): AmpCode[] {
  const out: AmpCode[] = [];
  const re = /%%\[|%%=|<script\b[^>]*runat\s*=\s*["']?server["']?[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const open = m[0];
    const kind: AmpCode["kind"] = open === "%%[" ? "block" : open === "%%=" ? "inline" : "script";
    if (kind === "script" && !/language\s*=\s*["']?ampscript/i.test(open)) continue;
    const close = kind === "block" ? "]%%" : kind === "inline" ? "=%%" : "</script>";
    const bodyStart = m.index + open.length;
    const end = kind === "script" ? source.toLowerCase().indexOf(close, bodyStart) : source.indexOf(close, bodyStart);
    out.push({ kind, start: bodyStart, code: source.slice(bodyStart, end === -1 ? source.length : end), closed: end !== -1 });
    re.lastIndex = end === -1 ? source.length : end + close.length;
  }
  return out;
}

/** Replaces string literals and comments with spaces so positions are preserved. */
function blankStrings(code: string) {
  return code.replace(/\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (s) => " ".repeat(s.length));
}

/** Static checks only: AMPscript is never executed by MailCraft. */
export function lintAmpscript(source: string): AmpDraft[] {
  const blocks = findAmpscript(source);
  if (blocks.length === 0) return [];
  const pos = makeLineIndex(source);
  const issues: AmpDraft[] = [];
  const at = (index: number) => pos(index);
  const declared = new Set<string>();
  const assigned = new Set<string>();
  const reads: { name: string; index: number }[] = [];
  // IF/ENDIF and FOR/NEXT commonly span several %%[ ]%% blocks with HTML in between, so balance is tracked document-wide.
  let ifDepth = 0, forDepth = 0;
  let firstIf = -1, firstFor = -1;

  for (const b of blocks) {
    if (!b.closed) {
      const { line, column } = at(b.start - 3);
      issues.push({
        ruleId: "ampscript-unclosed", category: "ampscript", severity: "critical", line, column,
        title: b.kind === "block" ? "AMPscript block is not closed with ]%%" : b.kind === "inline" ? "Inline AMPscript is not closed with =%%" : "AMPscript <script> tag is not closed",
        description: "Everything after this point is treated as AMPscript, so the rest of the email will fail validation or render as code.",
        whyItMatters: "Marketing Cloud rejects the send or shows raw code to subscribers.",
        recommendation: b.kind === "block" ? "Close the block with ]%%." : b.kind === "inline" ? "Close the expression with =%%." : "Add </script>.",
      });
      continue;
    }
    const smart = b.code.search(/[“”‘’]/);
    if (smart !== -1) {
      const { line, column } = at(b.start + smart);
      issues.push({
        ruleId: "ampscript-smart-quotes", category: "ampscript", severity: "high", line, column,
        title: "Curly quotes inside AMPscript",
        description: "AMPscript strings need straight quotes (\" or '). Curly quotes usually come from pasting out of a word processor.",
        whyItMatters: "The script fails to parse, so the email errors at send time.",
        recommendation: "Replace “ ” ‘ ’ with straight quotes.",
      });
    }
    const code = blankStrings(b.code);
    // Declarations and assignments, then every other @variable is a read.
    const writes = new Set<number>();
    for (const m of code.matchAll(/\bvar\s+(@\w+(?:\s*,\s*@\w+)*)/gi)) {
      for (const v of m[1].matchAll(/@\w+/g)) { declared.add(v[0].toLowerCase()); writes.add(m.index! + m[0].indexOf(m[1]) + v.index!); }
    }
    for (const m of code.matchAll(/\b(set|for)\s+(@\w+)/gi)) { assigned.add(m[2].toLowerCase()); writes.add(m.index! + m[0].lastIndexOf(m[2])); }
    for (const m of code.matchAll(/@\w+/g)) if (!writes.has(m.index!)) reads.push({ name: m[0].toLowerCase(), index: b.start + m.index! });

    for (const w of code.matchAll(/(?<![@\w])[A-Za-z_]\w*/g)) {
      const token = w[0];
      const lower = token.toLowerCase();
      const abs = b.start + w.index!;
      if (lower === "if") { if (ifDepth++ === 0) firstIf = abs; }
      else if (lower === "endif") ifDepth--;
      else if (lower === "for") { if (forDepth++ === 0) firstFor = abs; }
      else if (lower === "next") forDepth--;
      else if (!KEYWORDS.has(lower) && /^\s*\(/.test(code.slice(w.index! + token.length)) && !KNOWN.has(lower)) {
        const { line, column } = at(abs);
        issues.push({
          ruleId: "ampscript-unknown-function", category: "ampscript", severity: "low", line, column,
          title: `Unrecognised function ${token}()`,
          description: `${token} isn't in MailCraft's list of AMPscript functions. It may be misspelled, or it may be a newer function the list doesn't include.`,
          whyItMatters: "A misspelled function stops the script at send time.",
          recommendation: "Check the spelling against the AMPscript function reference.",
        });
      }
      if (ifDepth < 0 || forDepth < 0) {
        const { line, column } = at(abs);
        issues.push({ ruleId: "ampscript-unbalanced", category: "ampscript", severity: "high", line, column, title: `${token.toUpperCase()} without a matching ${lower === "endif" ? "IF" : "FOR"}`, description: "This closing keyword has no matching opening statement before it.", whyItMatters: "The script fails to parse.", recommendation: "Remove it or add the missing opening statement." });
        ifDepth = Math.max(ifDepth, 0);
        forDepth = Math.max(forDepth, 0);
      }
    }
  }

  if (ifDepth > 0) {
    const { line, column } = at(firstIf);
    issues.push({ ruleId: "ampscript-unbalanced", category: "ampscript", severity: "high", line, column, title: "IF without ENDIF", description: `${ifDepth} IF statement${ifDepth > 1 ? "s are" : " is"} not closed with ENDIF.`, whyItMatters: "The script fails to parse.", recommendation: "Add ENDIF to close each IF." });
  }
  if (forDepth > 0) {
    const { line, column } = at(firstFor);
    issues.push({ ruleId: "ampscript-unbalanced", category: "ampscript", severity: "high", line, column, title: "FOR without NEXT", description: "A FOR loop is not closed with NEXT.", whyItMatters: "The script fails to parse.", recommendation: "Close the loop with NEXT @i." });
  }

  const reported = new Set<string>();
  for (const r of reads) {
    if (assigned.has(r.name) || reported.has(r.name)) continue;
    reported.add(r.name);
    const { line, column } = at(r.index);
    issues.push({
      ruleId: "ampscript-unset-variable", category: "ampscript", severity: "medium", line, column,
      title: `${r.name} is used but never set`,
      description: declared.has(r.name) ? "The variable is declared with VAR but no SET assigns it, so it outputs an empty string." : "No VAR or SET for this variable appears in the email, so it outputs an empty string.",
      whyItMatters: "Subscribers see blank text where content was expected.",
      recommendation: `SET ${r.name} = ... before using it, with a fallback for empty values.`,
    });
  }
  return issues;
}
