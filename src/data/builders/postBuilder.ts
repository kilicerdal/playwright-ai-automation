export const buildPost = (
  overrides: Partial<{ userId: number; title: string; body: string }> = {},
) => ({
  userId: 7,
  title: 'Automation framework test post',
  body: 'Created by a deterministic test-data builder.',
  ...overrides,
});
