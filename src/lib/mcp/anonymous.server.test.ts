import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/quota.server', () => ({
  enforceQuota: vi.fn(async () => ({ allowed: true, tier: 'anon', limit: 100, used: 0, headers: {}, warning: null })),
  resolveApiKey: vi.fn(async () => null),
  quotaInvite: vi.fn(),
}));
import { handleAnonymousMcpPost } from './anonymous.server';

const post = (body: string) => handleAnonymousMcpPost(new Request('https://agentnexus.app/', { method: 'POST', body }));

describe('MCP request validation', () => {
  it.each(['', '{broken'])('rejects unparsable JSON: %s', async (body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe(-32700);
  });
  it.each([null, [], {}, { method: 'tools/list' }, { jsonrpc: '2.0', method: 3 }, { jsonrpc: '2.0', method: 'tools/list', params: null }])('rejects invalid envelopes: %j', async (body) => {
    const response = await post(JSON.stringify(body));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe(-32600);
  });
  it.each(['initialize', 'ping', 'tools/list'])('accepts valid %s requests', async (method) => {
    const response = await post(JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: {} }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(1);
    expect(body.result).toBeDefined();
    expect(body.error).toBeUndefined();
  });
});