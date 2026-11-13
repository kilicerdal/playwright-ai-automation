import { stripVTControlCharacters } from 'node:util';
export type MutationTestResult = {
  title: string;
  status: string;
  errors: { message?: string }[];
};
export function classifyMutation(
  tests: MutationTestResult[],
  expectedTitles: string[],
  exitCode: number | null,
  executionError: boolean,
) {
  const titles = tests.map((t) => t.title).sort();
  if (
    executionError ||
    JSON.stringify(titles) !== JSON.stringify([...expectedTitles].sort()) ||
    tests.some((t) => !['passed', 'failed'].includes(t.status))
  )
    return 'error';
  const failures = tests.filter((t) => t.status === 'failed');
  if (exitCode !== (failures.length ? 1 : 0)) return 'error';
  if (
    failures.some(
      (t) =>
        !t.errors.length ||
        t.errors.some((e) => {
          const message = stripVTControlCharacters(e.message ?? '');
          return !/^Error: MUTATION_ASSERTION [^\n]+\n\s*\nexpect\(/.test(message);
        }),
    )
  )
    return 'error';
  return failures.length ? 'killed' : 'survived';
}
