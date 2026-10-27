import { expect, it } from 'vitest';
import { withKeyInvitation } from './key-invitation';

it('preserves structured discovery data and appends without mutating the result', () => {
  const result = { content: [{ type: 'text', text: 'data' }], structuredContent: { count: 1, results: [{ slug: 'example' }] } };
  const output = withKeyInvitation(result);
  expect(output.structuredContent).toBe(result.structuredContent);
  expect(output.content).toHaveLength(2);
  expect(result.content).toHaveLength(1);
});

it('leaves tool failures unchanged', () => {
  const error = { content: [], isError: true };
  expect(withKeyInvitation(error)).toBe(error);
});