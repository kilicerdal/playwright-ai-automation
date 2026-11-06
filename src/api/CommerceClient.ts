import type { APIRequestContext, APIResponse } from '@playwright/test';
import { randomUUID } from 'node:crypto';
export class CommerceClient {
  constructor(
    readonly request: APIRequestContext,
    readonly csrf: string,
  ) {}
  add(productId: string, quantity = 1): Promise<APIResponse> {
    return this.request.post('/api/cart', {
      data: { productId, quantity },
      headers: { 'X-CSRF-Token': this.csrf },
    });
  }
  cart(): Promise<APIResponse> {
    return this.request.get('/api/cart');
  }
  remove(productId: string): Promise<APIResponse> {
    return this.request.delete(`/api/cart/${productId}`, {
      headers: { 'X-CSRF-Token': this.csrf },
    });
  }
  checkout(
    key: string = randomUUID(),
    shipping = { name: 'Alex Engineer', address: '100 Test Avenue' },
  ): Promise<APIResponse> {
    return this.request.post('/api/orders', {
      data: shipping,
      headers: { 'X-CSRF-Token': this.csrf, 'Idempotency-Key': key },
    });
  }
  orders(): Promise<APIResponse> {
    return this.request.get('/api/orders');
  }
  signOut(): Promise<APIResponse> {
    return this.request.delete('/api/session', { headers: { 'X-CSRF-Token': this.csrf } });
  }
}
