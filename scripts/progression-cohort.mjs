import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

// Each policy starts from the same fresh state and fixed random stream.
const limit = process.argv[2] ?? '3';
const destination = `output/playtests/2026-09-04${Number(limit) > 3 ? '/full-campaigns' : ''}`;
await mkdir(destination, { recursive: true });
const jobs = ['mixed', 'idle'].flatMap(profile => ['farm', 'push'].flatMap(policy =>
  Array.from({ length: 10 }, (_, i) => ({ profile, policy, seed: `progression-${i}` }))));
const results = [];
async function worker() {
  while (jobs.length) {
    const job = jobs.shift();
    const name = `${job.profile}-${job.policy}-${job.seed}`;
    if (Number(limit) > 3 && process.argv.includes('--resume')) {
      try {
        const previous = await readFile(`${destination}/${name}.jsonl`, 'utf8');
        const line = previous.split('\n').find(line => line.startsWith('PROGRESSION_RESULT '));
        const result = JSON.parse(line.slice('PROGRESSION_RESULT '.length));
        if (result.trackEra >= 1) { results.push(result); console.log(`RESUMED ${JSON.stringify(result)}`); continue; }
      } catch { /* No completed measurement yet. */ }
    }
    const output = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/simulate-progression.ts', job.profile, job.policy, job.seed, limit], { stdio: ['ignore', 'pipe', 'pipe'] });
      let text = '';
      child.stdout.on('data', data => { text += data; });
      child.stderr.on('data', data => { text += data; });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve(text) : reject(new Error(`${name}: ${code}\n${text}`)));
    });
    await writeFile(`${destination}/${name}.jsonl`, output);
    const line = output.split('\n').find(line => line.startsWith('PROGRESSION_RESULT '));
    const result = JSON.parse(line.slice('PROGRESSION_RESULT '.length));
    results.push(result);
    console.log(JSON.stringify(result));
  }
}
const concurrency = Math.max(1, Math.min(6, Number(process.argv[3] ?? 3)));
await Promise.all(Array.from({ length: concurrency }, () => worker()));
await writeFile(`${destination}/cohort.json`, JSON.stringify(results, null, 2));
