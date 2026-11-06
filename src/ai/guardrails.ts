import ts from 'typescript';
import type { Evidence, Plan, Requirement } from './contracts';
export function redact(value: string): string {
  return value
    .replace(/\bBearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/\bsk-[\w-]+/g, '[REDACTED_KEY]')
    .replace(
      /\b(password|token|api[_-]?key|cookie|authorization)\s*[:=]\s*[^\s,;]+/gi,
      '$1=[REDACTED]',
    )
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]');
}
export function validatePlan(plan: Plan, requirements: Requirement[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const titles = new Set<string>();
  for (const scenario of plan.scenarios) {
    if (!requirements.some((r) => r.id === scenario.requirementId))
      errors.push(`Unknown requirement ${scenario.requirementId}`);
    if (ids.has(scenario.id)) errors.push(`Duplicate scenario ${scenario.id}`);
    ids.add(scenario.id);
    const title = scenario.title.toLowerCase().trim();
    if (titles.has(title)) errors.push(`Duplicate title ${scenario.title}`);
    titles.add(title);
    if (!scenario.steps.length || !scenario.expected.trim())
      errors.push(`Missing executable intent ${scenario.id}`);
  }
  for (const requirement of requirements) {
    const scenarios = plan.scenarios.filter((s) => s.requirementId === requirement.id);
    if (!scenarios.some((s) => s.kind === 'positive'))
      errors.push(`Missing positive coverage ${requirement.id}`);
    if (!scenarios.some((s) => s.kind !== 'positive'))
      errors.push(`Missing risk coverage ${requirement.id}`);
  }
  return errors;
}
export function validateCitations(ids: string[], evidence: Evidence[]): string[] {
  return ids
    .filter((id) => !evidence.some((e) => e.id === id))
    .map((id) => `Unsupported evidence ${id}`);
}
/** Static review aid, never an execution sandbox. Drafts stay outside testDir. */
export function inspectDraft(code: string): string[] {
  const source = ts.createSourceFile(
    'draft.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const errors: string[] = [];
  const forbidden =
    /\b(eval|Function|process|require|fetch|XMLHttpRequest|WebSocket|exec|spawn|writeFile|readFile|waitForTimeout|storageState|addInitScript|evaluate|route|skip|fixme|only)\b/;
  if (forbidden.test(code)) errors.push('Forbidden execution, bypass, or flaky-wait construct');
  if (/https?:\/\//.test(code)) errors.push('External destinations are not allowed');
  let assertions = 0;
  let tests = 0;
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      if (
        !ts.isStringLiteral(node.moduleSpecifier) ||
        node.moduleSpecifier.text !== '../src/fixtures/commerce'
      )
        errors.push('Only the approved fixture import is allowed');
    }
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword)
        errors.push('Dynamic import is not allowed');
      if (ts.isIdentifier(node.expression) && node.expression.text === 'expect') assertions++;
      if (ts.isIdentifier(node.expression) && node.expression.text === 'test') tests++;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!assertions || !tests) errors.push('Draft needs test cases and explicit assertions');
  return errors;
}
export function retrieve(query: string, requirements: Requirement[], limit = 7): Requirement[] {
  const words = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return requirements
    .map((r, index) => ({
      r,
      index,
      score: words.filter((w) => `${r.id} ${r.text}`.toLowerCase().includes(w)).length,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.r);
}
