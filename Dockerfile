FROM node:20-alpine
WORKDIR /app
COPY packages/agentnexus-mcp ./packages/agentnexus-mcp
CMD ["node", "packages/agentnexus-mcp/server.js"]
