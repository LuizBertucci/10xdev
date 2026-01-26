/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const PRD_PATH = path.join(ROOT, 'prd.json');
const PROGRESS_PATH = path.join(ROOT, 'progress.txt');
const OUTPUT_LOG_PATH = path.join(ROOT, 'ralph-output.log');

function nowIso() {
  return new Date().toISOString();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonPretty(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n');
}

function appendProgress(lines) {
  const text = lines.join('\n') + '\n';
  fs.appendFileSync(PROGRESS_PATH, text);
}

function appendOutputLog(headerLines, output) {
  const header = headerLines.join('\n') + '\n';
  fs.appendFileSync(OUTPUT_LOG_PATH, header);
  fs.appendFileSync(OUTPUT_LOG_PATH, output + (output.endsWith('\n') ? '' : '\n'));
}

function runCmd(cmd) {
  const res = spawnSync(cmd, {
    shell: true,
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const combined = (res.stdout || '') + (res.stderr ? `\n${res.stderr}` : '');
  return { code: res.status ?? 1, output: combined.trimEnd() };
}

function getFirstPendingStory(prd) {
  return prd.stories.find((s) => !s.passes);
}

function ensureFiles() {
  if (!fs.existsSync(PRD_PATH)) {
    throw new Error('Missing prd.json');
  }
  if (!fs.existsSync(PROGRESS_PATH)) {
    fs.writeFileSync(PROGRESS_PATH, '=== Ralph progress log ===\n');
  }
}

function parseArgs(argv) {
  const args = { max: 1 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--max') args.max = Number(argv[++i] || '1');
  }
  if (!Number.isFinite(args.max) || args.max < 1) args.max = 1;
  return args;
}

function defaultCommandsForStory(story) {
  // Back-compat: if you don't define story.run, we try a sane default based on text.
  // Prefer setting story.run/story.verify explicitly in prd.json.
  const title = String(story.title || '').toLowerCase();
  const ac = (story.acceptance_criteria || []).join('\n').toLowerCase();

  if (title.includes('card') || ac.includes('/api/card-features')) {
    return {
      run: ['./execute-cardfeature.sh clawdbot-post.json'],
      verify: [],
    };
  }

  return { run: [], verify: [] };
}

function main() {
  ensureFiles();
  const { max } = parseArgs(process.argv);

  for (let iter = 1; iter <= max; iter++) {
    const prd = readJson(PRD_PATH);
    const story = getFirstPendingStory(prd);

    if (!story) {
      console.log('<promise>complete</promise>');
      return;
    }

    const id = story.id ?? '?';
    const title = story.title ?? '(no title)';
    const startedAt = nowIso();

    const fallback = defaultCommandsForStory(story);
    const runList = Array.isArray(story.run) ? story.run : fallback.run;
    const verifyList = Array.isArray(story.verify) ? story.verify : fallback.verify;

    const header = [
      `=== ${startedAt} | Iteration ${iter} ===`,
      `Story ${id}: ${title}`,
      `Run: ${runList.length ? runList.join(' && ') : '(none)'}`,
      `Verify: ${verifyList.length ? verifyList.join(' && ') : '(none)'}`,
    ];

    let ok = true;
    const commandResults = [];

    for (const cmd of runList) {
      const r = runCmd(cmd);
      commandResults.push({ phase: 'run', cmd, ...r });
      appendOutputLog([...header, `--- RUN: ${cmd} (exit=${r.code}) ---`], r.output);
      if (r.code !== 0) {
        ok = false;
        break;
      }
    }

    if (ok) {
      for (const cmd of verifyList) {
        const r = runCmd(cmd);
        commandResults.push({ phase: 'verify', cmd, ...r });
        appendOutputLog([...header, `--- VERIFY: ${cmd} (exit=${r.code}) ---`], r.output);
        if (r.code !== 0) {
          ok = false;
          break;
        }
      }
    }

    const endedAt = nowIso();
    appendProgress([
      ...header,
      `Result: ${ok ? '✅ SUCCESS' : '❌ FAIL'}`,
      `Ended: ${endedAt}`,
      '',
    ]);

    if (ok) {
      // mark passes true
      story.passes = true;
      writeJsonPretty(PRD_PATH, prd);
    } else {
      process.exitCode = 1;
      return;
    }
  }
}

main();

