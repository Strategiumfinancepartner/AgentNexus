import { beforeEach, expect, it, vi } from 'vitest';

const { reads, client } = vi.hoisted(() => {
  const reads: unknown[] = [];
  const query: any = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockImplementation(async () => reads.shift());
  return { reads, client: { from: vi.fn((_table: string) => query), rpc: vi.fn(async () => { const r: any = reads.shift(); return { data: r.data?.to_slug ?? null, error: r.error }; }) } };
});
vi.mock('../supabase', () => ({ PUBLIC_COLUMNS: 'slug', supabaseAnon: () => client }));
import getEntry from './get-entry';

beforeEach(() => { reads.length = 0; vi.clearAllMocks(); });

it('resolves Nova old slug to the canonical approved entry', async () => {
  reads.push({ data: null, error: null }, { data: { to_slug: 'remote-jobs-api-api-nfpe' }, error: null }, { data: { slug: 'remote-jobs-api-api-nfpe' }, error: null });
  const result = await getEntry.handler({ slug: 'remote-jobs-api-api-0na6' }, {} as any);
  expect(result.structuredContent?.['entry']).toEqual({ slug: 'remote-jobs-api-api-nfpe' });
  expect(client.from('entries').eq).toHaveBeenCalledWith('status', 'approved');
});

it('does not expose an alias target that is not approved', async () => {
  reads.push({ data: null, error: null }, { data: { to_slug: 'retired-target' }, error: null }, { data: null, error: null });
  await expect(getEntry.handler({ slug: 'old-slug' }, {} as any)).rejects.toThrow();
});