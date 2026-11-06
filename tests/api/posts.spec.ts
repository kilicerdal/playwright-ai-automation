import { test, expect } from '../../src/fixtures/test';
import { postSchema } from '../../src/api/schemas/postSchema';
import { buildPost } from '../../src/data/builders/postBuilder';

test.describe('Posts API', () => {
  test('@smoke GET returns a contract-valid post', async ({ postsClient }) => {
    const response = await postsClient.getPost(1);
    expect(response.ok()).toBeTruthy();
    const body: unknown = await response.json();
    const parsed = postSchema.safeParse(body);
    expect(parsed.success).toBeTruthy();
  });

  test('POST creates a post', async ({ postsClient }) => {
    const payload = buildPost();
    const response = await postsClient.createPost(payload);
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject(payload);
    expect(body.id).toBeDefined();
  });
});

test('missing post returns 404 and an empty response object', async ({ postsClient }) => {
  const response = await postsClient.getPost(999999);
  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({});
});

test('post response identifies the requested resource and JSON content type', async ({
  postsClient,
}) => {
  const response = await postsClient.getPost(2);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  const post = postSchema.parse(await response.json());
  expect(post.id).toBe(2);
});

test('contract rejects malformed and incomplete response bodies', () => {
  const valid = { userId: 1, id: 1, title: 'Demo', body: 'Content' };
  expect(postSchema.safeParse(valid).success).toBe(true);
  for (const invalid of [
    null,
    {},
    [],
    { ...valid, id: '1' },
    { ...valid, id: -1 },
    { ...valid, userId: 0 },
    { ...valid, title: '' },
    { ...valid, body: '' },
  ]) {
    expect(postSchema.safeParse(invalid).success).toBe(false);
  }
});
