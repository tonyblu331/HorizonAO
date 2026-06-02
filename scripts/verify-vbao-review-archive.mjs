#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const manifestPath = path.join(
  repoRoot,
  'openspec/changes/vbao-release-candidate-gates/review-archive-manifest.md',
)

function normalizeRepoPath(filePath) {
  return filePath.split(path.sep).join('/')
}

function readManifestEntries(source) {
  return [...source.matchAll(/^- `([^`]+)`/gm)].map((match) => match[1])
}

function resolveImportPath(fromEntry, importPath) {
  const cleanImportPath = importPath.split('?')[0]
  if (!cleanImportPath.startsWith('.')) return undefined

  const fromDir = path.dirname(path.join(repoRoot, fromEntry))
  const base = path.resolve(fromDir, cleanImportPath)
  const candidates = path.extname(base)
    ? [base]
    : [`${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.mts`, `${base}.md`, path.join(base, 'index.ts')]

  const resolved = candidates.find((candidate) => existsSync(candidate))
  return resolved === undefined ? undefined : normalizeRepoPath(path.relative(repoRoot, resolved))
}

function readRelativeImports(entry) {
  const fullPath = path.join(repoRoot, entry)
  if (!/\.(?:ts|tsx|mjs|mts)$/.test(entry)) return []

  const source = readFileSync(fullPath, 'utf8')
  return [...source.matchAll(/^\s*(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm)]
    .map((match) => match[1])
    .map((importPath) => resolveImportPath(entry, importPath))
    .filter((resolved) => resolved !== undefined)
}

export function verifyManifestImportClosure(source = readFileSync(manifestPath, 'utf8')) {
  const entries = readManifestEntries(source)
  const entrySet = new Set(entries)
  const missingFiles = entries.filter((entry) => !existsSync(path.join(repoRoot, entry)))
  const missingImports = []

  for (const entry of entries) {
    if (!existsSync(path.join(repoRoot, entry))) continue
    for (const importedEntry of readRelativeImports(entry)) {
      if (!entrySet.has(importedEntry)) {
        missingImports.push({ from: entry, import: importedEntry })
      }
    }
  }

  return {
    manifestPath: normalizeRepoPath(path.relative(repoRoot, manifestPath)),
    entries,
    missingFiles,
    missingImports,
    passed: missingFiles.length === 0 && missingImports.length === 0,
  }
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const result = verifyManifestImportClosure()
  console.log(JSON.stringify(result, null, 2))
  if (!result.passed) process.exitCode = 1
}
