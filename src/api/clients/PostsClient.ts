import type { APIRequestContext, APIResponse } from '@playwright/test';

export class PostsClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
  ) {}

  getPost(id: number): Promise<APIResponse> {
    return this.request.get(`${this.baseUrl}/posts/${id}`);
  }

  createPost(payload: { userId: number; title: string; body: string }): Promise<APIResponse> {
    return this.request.post(`${this.baseUrl}/posts`, { data: payload });
  }
}
