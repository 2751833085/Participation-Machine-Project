#!/usr/bin/env node
/**
 * Split inline <style> and <script> blocks from a messy HTML file into separate
 * .css / .js files and rewrite the HTML with <link> / <script src>.
 *
 * Usage:
 *   node tools/split-html-assets.mjs path/to/page.html [outputDir]
 *
 * Default outputDir: same folder as the HTML file, subfolder "split-out/"
 *
 * Limits (intentionally simple):
 *   - Only INLINE blocks (skips <script src=...>).
 *   - Regex-based: can mis-handle </script> inside JS strings — fix manually if needed.
 */

import fs from "node:fs/promises";
import path from "node:path";

const STYLE_RE = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
const SCRIPT_RE =
  /<script((?![^>]*\bsrc\s*=)[^>]*)>([\s\S]*?)<\/script>/gi;

function slugBase(filePath) {
  return path
    .basename(filePath, path.extname(filePath))
    .replace(/[^\w.-]+/g, "-");
}

function collectMatches(re, text) {
  const list = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    list.push({
      full: m[0],
      openAttrs: (m[1] || "").trim(),
      body: m[2],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return list;
}

function applyFromEnd(html, chunks) {
  chunks.sort((a, b) => b.start - a.start);
  let out = html;
  for (const { start, end, replacement } of chunks) {
    out = out.slice(0, start) + replacement + out.slice(end);
  }
  return out;
}

async function main() {
  const htmlPath = process.argv[2];
  if (!htmlPath) {
    console.error(
      "Usage: node tools/split-html-assets.mjs <input.html> [outputDir]"
    );
    process.exit(1);
  }

  const absHtml = path.resolve(htmlPath);
  const outDir =
    process.argv[3] != null
      ? path.resolve(process.argv[3])
      : path.join(path.dirname(absHtml), "split-out");

  await fs.mkdir(outDir, { recursive: true });

  const raw = await fs.readFile(absHtml, "utf8");
  const base = slugBase(absHtml);
  // Assets and .split.html are written under outDir — href/src are same-folder paths.

  const styleMatches = collectMatches(new RegExp(STYLE_RE.source, STYLE_RE.flags), raw);
  const scriptMatches = collectMatches(
    new RegExp(SCRIPT_RE.source, SCRIPT_RE.flags),
    raw
  );

  if (!styleMatches.length && !scriptMatches.length) {
    console.log(
      "No inline <style> or inline <script> (without src) found. Nothing to do."
    );
    return;
  }

  const replacements = [];
  let styleIndex = 0;
  for (const m of styleMatches) {
    styleIndex += 1;
    const body = m.body.trimEnd();
    const name = `${base}-style-${styleIndex}.css`;
    const filePath = path.join(outDir, name);
    await fs.writeFile(
      filePath,
      body.endsWith("\n") ? body : `${body}\n`,
      "utf8"
    );
    const href = name.replace(/\\/g, "/");
    const note = m.openAttrs
      ? `\n<!-- style #${styleIndex} had attributes: ${m.openAttrs} -->\n`
      : "\n";
    const linkTag = `${note}<link rel="stylesheet" href="${href}">`;
    replacements.push({ start: m.start, end: m.end, replacement: linkTag });
  }

  let scriptIndex = 0;
  for (const m of scriptMatches) {
    scriptIndex += 1;
    const body = m.body.trimEnd();
    const name = `${base}-script-${scriptIndex}.js`;
    const filePath = path.join(outDir, name);
    await fs.writeFile(
      filePath,
      body.endsWith("\n") ? body : `${body}\n`,
      "utf8"
    );
    const src = name.replace(/\\/g, "/");
    const open = m.openAttrs;
    const scriptTag = open
      ? `\n<!-- was inline script #${scriptIndex} -->\n<script ${open} src="${src}"></script>\n`
      : `\n<!-- was inline script #${scriptIndex} -->\n<script src="${src}"></script>\n`;
    replacements.push({ start: m.start, end: m.end, replacement: scriptTag });
  }

  const html = applyFromEnd(raw, replacements);
  const outHtml = path.join(outDir, `${base}.split.html`);
  await fs.writeFile(outHtml, html, "utf8");

  console.log("Done.");
  console.log(`  Wrote: ${outHtml}`);
  console.log(
    `  Extracted ${styleMatches.length} style block(s), ${scriptMatches.length} script block(s) → ${outDir}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
