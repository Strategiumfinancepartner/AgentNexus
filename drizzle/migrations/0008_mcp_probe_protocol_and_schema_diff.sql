ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS mcp_protocol_version text,
  ADD COLUMN IF NOT EXISTS tool_schemas jsonb,
  ADD COLUMN IF NOT EXISTS tool_schema_changes text[],
  ADD COLUMN IF NOT EXISTS tool_schema_changed_at timestamptz;
GRANT SELECT (mcp_protocol_version, tool_schema_changes, tool_schema_changed_at) ON public.entries TO anon, authenticated;