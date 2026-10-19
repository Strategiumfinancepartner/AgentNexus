# Agent Nexus is a hosted remote MCP server (https://agentnexus.app/mcp).
# This image bridges it to stdio so registries like Glama can start it
# and run introspection (initialize, tools/list) locally.
FROM node:20-alpine
RUN npm install -g mcp-remote@latest
ENTRYPOINT ["mcp-remote", "https://agentnexus.app/mcp", "--transport", "http-only"]
