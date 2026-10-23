import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = process.argv[2] ? path.resolve(process.argv[2]) : fileURLToPath(new URL('../dist/', import.meta.url));
const failures = [];
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) failures.push(`部署目录不能包含符号链接：${path.relative(root, full)}`);
    else if (entry.isDirectory()) await walk(full);
    else if (entry.isFile()) files.push(full);
  }
}

await walk(root);
if (!files.includes(path.join(root, 'index.html'))) failures.push('缺少 dist/index.html。');
async function checkReference(source, reference) {
  if (!reference || /^(?:#|data:|https?:|mailto:|tel:|blob:)/i.test(reference)) return;
  if (reference.startsWith('/')) {
    // This is a personal root-domain site. The owner UI deliberately uses same-origin API routes.
    if (reference === '/' || reference.startsWith('/api/manor/') || reference.startsWith('/admin/')) return;
    await checkReference(path.join(root, 'index.html'), reference.slice(1));
    return;
  }
  const clean = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  if (!clean) return;
  const target = path.resolve(path.dirname(source), clean);
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    failures.push(`资源超出 dist：${reference}`);
    return;
  }
  try {
    await stat(target);
  } catch {
    failures.push(`${path.relative(root, source)} 引用了不存在的文件：${reference}`);
  }
}

for (const file of files) {
  const extension = path.extname(file);
  if (extension === '.js') {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) failures.push(result.stderr || `JavaScript 语法检查失败：${file}`);
    const source = await readFile(file, 'utf8');
    const modules = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)];
    for (const match of modules) await checkReference(file, match[1]);
    const assets = [...source.matchAll(/new URL\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*,\s*import\.meta\.url/g)];
    for (const match of assets) await checkReference(file, match[1]);
  }
  if (extension !== '.html' && extension !== '.css') continue;
  const content = await readFile(file, 'utf8');
  const references = extension === '.html'
    ? [...content.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1])
    : [...content.matchAll(/url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s)'";]+))\s*\)/gi)].map((match) => (match[1] ?? match[2] ?? match[3]).trim());
  for (const reference of references) await checkReference(file, reference);
  if (extension === '.html' && /<(?:script|img|source)\b[^>]*\bsrc=["']https?:/i.test(content)) failures.push(`${path.relative(root, file)} 包含运行时外部资源。`);
  if (extension === '.css' && /(?:@import\s+["']https?:|url\(\s*["']?https?:)/i.test(content)) failures.push(`${path.relative(root, file)} 包含运行时外部样式或字体。`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`检查通过：${files.length} 个静态文件；本地资源引用与 JavaScript 语法正常。`);
}
