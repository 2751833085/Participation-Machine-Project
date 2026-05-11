#!/usr/bin/env node
/**
 * One-off transform: rewrite `// #region agent log … // #endregion` blocks
 * from inline `fetch(...)` calls to `agentLog({...})` invocations using the
 * shared helper in public/js/lib/agent-log.js.
 *
 * Idempotent: re-running is safe (already-transformed blocks are skipped).
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, relative, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const publicRoot = resolve(repoRoot, "public");

const TARGETS = [
  "public/js/app.js",
  "public/js/components/modal.js",
  "public/js/components/shell.js",
  "public/js/lib/auth-bootstrap.js",
  "public/js/lib/dock-visual-viewport.js",
  "public/js/lib/entry-welcome.js",
  "public/js/lib/ui-theme.js",
  "public/js/pages/challenge.js",
  "public/js/pages/create-map.js",
  "public/js/pages/create-picker.js",
  "public/js/pages/create.js",
  "public/js/pages/favorited.js",
  "public/js/pages/home.js",
  "public/js/pages/hunt-review.js",
  "public/js/pages/leaderboard.js",
  "public/js/pages/login.js",
  "public/js/pages/map.js",
  "public/js/pages/profile.js",
  "public/js/pages/run.js",
];

function extractStringField(block, name) {
  const re = new RegExp(`${name}:\\s*(\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*')`);
  const m = re.exec(block);
  return m ? m[1] : null;
}

/**
 * Extract the expression after `data:` as raw source, using balanced braces.
 * Returns { expr, firstLineCol } or null if not found.
 */
function extractDataExpression(block) {
  const key = /\bdata:\s*/g;
  const m = key.exec(block);
  if (!m) return null;
  const start = m.index + m[0].length;
  if (block[start] !== "{") return null;
  return balancedObjectExpression(block, start);
}

function balancedObjectExpression(block, start) {
  let depth = 0;
  let inStr = null;
  for (let i = start; i < block.length; i++) {
    const c = block[i];
    if (inStr) {
      const next = advanceStringScan(block, i, inStr);
      i = next.index;
      inStr = next.inStr;
      continue;
    }
    const quote = quoteChar(c);
    if (quote) {
      inStr = quote;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return { expr: block.slice(start, i + 1) };
  }
  return null;
}

function quoteChar(c) {
  return c === '"' || c === "'" || c === "`" ? c : null;
}

function advanceStringScan(block, index, inStr) {
  const c = block[index];
  if (c === "\\") return { index: index + 1, inStr };
  if (c === inStr) return { index, inStr: null };
  return { index, inStr };
}

/**
 * Reindent a multi-line JS expression so its first line sits at `baseCol`
 * spaces and continuation lines shift by the same delta.
 */
function reindent(expr, baseCol) {
  const lines = expr.split("\n");
  if (lines.length === 1) return expr;
  // Find min indent of continuation lines (excluding empty lines).
  const minIndent = continuationMinIndent(lines);
  if (!Number.isFinite(minIndent)) return expr;
  // Desired continuation indent: baseCol (opening brace sits here) — inner
  // members sit at baseCol + 2. So shift continuation lines by (baseCol + 2 - minIndent).
  // Actually the last line (closing brace) should sit at baseCol. The expr we
  // extracted starts and ends with a brace at column 0 relative to its own
  // string. Strategy: compute delta = baseCol - originalFirstBraceCol. The
  // first char of `expr` is `{` (we validated). Its original column in the
  // source block is whatever — but within `expr` it's at index 0. Instead of
  // computing absolute columns, we align using minIndent of continuation
  // lines: assume inner members were at minIndent; we want them at baseCol + 2.
  const desiredInnerIndent = baseCol + 2;
  const delta = desiredInnerIndent - minIndent;
  if (delta === 0) return expr;
  return lines
    .map((line, idx) => reindentLine(line, idx, delta))
    .join("\n");
}

function continuationMinIndent(lines) {
  let minIndent = Infinity;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    minIndent = Math.min(minIndent, lineIndent(line));
  }
  return minIndent;
}

function reindentLine(line, idx, delta) {
  if (idx === 0 || !line.trim()) return line;
  if (delta > 0) return " ".repeat(delta) + line;
  const stripCount = Math.min(-delta, lineIndent(line));
  return line.slice(stripCount);
}

function lineIndent(line) {
  return line.match(/^[\t ]*/)[0].length;
}

function buildReplacement(indent, runId, hypothesisId, location, message, dataExpr) {
  const innerIndent = indent + "  ";
  const dataBaseCol = innerIndent.length + "data: ".length;
  const reindented = reindent(dataExpr, dataBaseCol - 2);
  // dataBaseCol - 2 because `data: ` leads `{`; the `{` sits at dataBaseCol,
  // and inner members should be at dataBaseCol + 2, so passing baseCol that
  // yields (baseCol + 2) == dataBaseCol + 2 means baseCol = dataBaseCol.
  // Recompute: reindent(expr, baseCol) treats `baseCol + 2` as target inner
  // indent. We want inner at dataBaseCol + 2. So baseCol = dataBaseCol.
  const finalData = reindent(dataExpr, dataBaseCol);
  const lines = [
    `${indent}agentLog({`,
    `${innerIndent}runId: ${runId},`,
    `${innerIndent}hypothesisId: ${hypothesisId},`,
    `${innerIndent}location: ${location},`,
    `${innerIndent}message: ${message},`,
    `${innerIndent}data: ${finalData},`,
    `${indent}});`,
  ];
  return lines.join("\n");
}

function computeRelImportPath(fromAbs) {
  const helperAbs = resolve(publicRoot, "js/lib/agent-log.js");
  let rel = relative(dirname(fromAbs), helperAbs);
  rel = rel.split("\\").join("/"); // windows-safe, harmless on posix
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

function ensureImport(source, relPath) {
  if (/from\s+["'][^"']*agent-log\.js["']/.test(source)) return source;
  // Insert after the last top-of-file import statement, or at line 0 if none.
  const importRe = /^import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm;
  let lastEnd = -1;
  let m;
  while ((m = importRe.exec(source)) !== null) {
    // Stop if we see something that's not an import at top-ish level.
    lastEnd = m.index + m[0].length;
  }
  const importLine = `import { agentLog } from "${relPath}";`;
  if (lastEnd === -1) {
    // No imports — insert after leading comment block if present.
    const leadingCommentRe = /^(\s*\/\*[\s\S]*?\*\/\s*\n)?/;
    const lc = leadingCommentRe.exec(source);
    const insertAt = lc ? lc[0].length : 0;
    return (
      source.slice(0, insertAt) +
      importLine + "\n\n" +
      source.slice(insertAt)
    );
  }
  return (
    source.slice(0, lastEnd) + "\n" + importLine + source.slice(lastEnd)
  );
}

async function transformFile(relPath) {
  const abs = resolve(repoRoot, relPath);
  const original = await readFile(abs, "utf8");
  const lines = original.split("\n");
  const out = [];
  let i = 0;
  let replaced = 0;
  while (i < lines.length) {
    const startMatch = lines[i].match(/^(\s*)\/\/\s*#region agent log\s*$/);
    if (!startMatch) {
      out.push(lines[i]);
      i++;
      continue;
    }
    const indent = startMatch[1];
    // Find #endregion.
    const j = findAgentLogRegionEnd(lines, i + 1);
    if (j >= lines.length) {
      // Unterminated — emit verbatim.
      out.push(lines[i]);
      i++;
      continue;
    }
    replaced += appendTransformedAgentLogRegion(out, lines, i, j, indent, relPath);
    i = j + 1;
  }
  if (replaced === 0) {
    return { replaced: 0, changed: false };
  }
  let rewritten = out.join("\n");
  const relImport = computeRelImportPath(abs);
  rewritten = ensureImport(rewritten, relImport);
  await writeFile(abs, rewritten, "utf8");
  return { replaced, changed: true };
}

function findAgentLogRegionEnd(lines, start) {
  let j = start;
  while (j < lines.length && !/^\s*\/\/\s*#endregion\s*$/.test(lines[j])) j++;
  return j;
}

function appendOriginalRegion(out, lines, start, end) {
  for (let k = start; k <= end; k++) out.push(lines[k]);
}

function appendTransformedAgentLogRegion(out, lines, start, end, indent, relPath) {
  const block = lines.slice(start + 1, end).join("\n");
  if (!/fetch\("http:\/\/127\.0\.0\.1:7333\/ingest/.test(block)) {
    appendOriginalRegion(out, lines, start, end);
    return 0;
  }
  const parsed = parseAgentLogBlock(block);
  if (!parsed) {
    console.warn(`  ! ${relPath}: could not parse block near line ${start + 1}, keeping original`);
    appendOriginalRegion(out, lines, start, end);
    return 0;
  }
  out.push(
    buildReplacement(
      indent,
      parsed.runId,
      parsed.hypothesisId,
      parsed.location,
      parsed.message,
      parsed.dataExpr,
    ),
  );
  return 1;
}

function parseAgentLogBlock(block) {
  const runId = extractStringField(block, "runId");
  const hypothesisId = extractStringField(block, "hypothesisId");
  const location = extractStringField(block, "location");
  const message = extractStringField(block, "message");
  const dataInfo = extractDataExpression(block);
  if (!runId || !hypothesisId || !location || !message || !dataInfo) return null;
  return { runId, hypothesisId, location, message, dataExpr: dataInfo.expr };
}

async function main() {
  let total = 0;
  for (const t of TARGETS) {
    const { replaced } = await transformFile(t);
    console.log(`  ${replaced.toString().padStart(3)} ${t}`);
    total += replaced;
  }
  console.log(`\nTotal blocks rewritten: ${total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
