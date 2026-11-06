import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, v]) => JSON.stringify(key) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
export function contractHash(value: unknown) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
export async function checkContract() {
  const path = 'contracts/commerce.v3.json';
  const spec = JSON.parse(await readFile(path, 'utf8'));
  await SwaggerParser.validate(path);
  const approved = (await readFile('contracts/commerce.v3.approved.sha256', 'utf8')).trim();
  if (contractHash(spec) !== approved)
    throw new Error(
      'API contract changed: review compatibility and version the approved baseline explicitly',
    );
  return { version: spec.info.version, hash: approved, paths: Object.keys(spec.paths).length };
}
let document: Promise<unknown> | undefined;
export async function validateResponse(
  path: string,
  method: string,
  status: number,
  body: unknown,
): Promise<string[]> {
  document ??= SwaggerParser.dereference('contracts/commerce.v3.json');
  const spec = (await document) as {
    paths: Record<
      string,
      Record<
        string,
        { responses: Record<string, { content?: Record<string, { schema: object }> }> }
      >
    >;
  };
  const schema =
    spec.paths[path]?.[method]?.responses[String(status)]?.content?.['application/json']?.schema;
  if (!schema) return ['Response is not documented in the versioned contract'];
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  const valid = ajv.compile(schema);
  return valid(body)
    ? []
    : (valid.errors ?? []).map((error) => `${error.instancePath}: ${error.message}`);
}
