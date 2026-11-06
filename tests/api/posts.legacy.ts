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
