# WeStride MCP

[mcp.westride.org](https://mcp.westride.org/mcp)

MCP server for the WeStride platform. It speaks stateless Streamable HTTP at
`/mcp` and reads data through the WeStride API (`apps/api`).

## Tools

| Tool                  | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `list_academy_tracks` | Every WeStride Academy track, in recommended order.  |

## Local development

```bash
cp apps/mcp/.env.example apps/mcp/.env
bun run dev:mcp   # starts the API on :3001 and the MCP server on :3002
```

`WESTRIDE_API_URL` defaults to `https://api.westride.org`, so production needs
no configuration. Locally it points at `http://localhost:3001`.

To try it from Cursor, add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "westride": { "url": "http://localhost:3002/mcp" }
  }
}
```
