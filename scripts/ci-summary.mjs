import fs from 'node:fs';
import process from 'node:process';

const lines = [
  '## Automated test results',
  '',
  '| Report | Passed | Failed | Flaky | Skipped | Duration |',
  '| --- | ---: | ---: | ---: | ---: | ---: |',
];
let missing = false;
for (const file of process.argv.slice(2)) {
  const label = file.replace(/[|\r\n]/g, '');
  if (!fs.existsSync(file)) {
    missing = true;
    lines.push(`| ${label} | Not generated | — | — | — | — |`);
    continue;
  }
  const { stats } = JSON.parse(fs.readFileSync(file, 'utf8'));
  lines.push(
    `| ${label} | ${stats.expected} | ${stats.unexpected} | ${stats.flaky} | ${stats.skipped} | ${(stats.duration / 1000).toFixed(1)}s |`,
  );
}
lines.push(
  '',
  'Counts describe test executions in the listed reports, not code coverage. Unit checks are reported separately in their job step.',
);
if (missing)
  lines.push(
    '',
    'A report was not generated. Inspect earlier job steps; missing results do not imply passing tests.',
  );
lines.push(
  '',
  'Download the workflow artifacts and open the HTML report for test steps. Failure traces are included when generated.',
);
const summary = lines.join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
else process.stdout.write(summary);
