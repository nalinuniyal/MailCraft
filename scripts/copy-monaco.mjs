// Self-host Monaco (no CDN): copies the AMD build into public/monaco/vs.
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
const src = path.join(process.cwd(), "node_modules", "monaco-editor", "min", "vs");
const dest = path.join(process.cwd(), "public", "monaco", "vs");
if (existsSync(dest)) rmSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`monaco copied to ${path.relative(process.cwd(), dest)}`);
