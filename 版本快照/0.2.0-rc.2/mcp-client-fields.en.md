# MCP client field table (`dsh-mcp-client` `0.2.0-rc.2` snapshot)

*English mirror of `mcp-client-字段.md`; that Chinese file is the source of truth if they disagree.* ｜ [中文](mcp-client-字段.md)

Fields and default values are **version data of that package itself**. Checking with one command before writing is more reliable than memorizing the table:

```
Config.listConfigs { name: "@deepseek-ai/dsh-mcp-client" }
```

## The fields found at the time

| Field | Required | Description |
|---|---|---|
| `transport` | **yes** | `stdio` or `streamable-http` |
| `serverName` | **yes** | tool name prefix; `[A-Za-z0-9_-]{1,32}`, **unique within the same registration scope** (it is not the remote `serverInfo.name`) |
| `command` / `args` / `env` / `cwd` | — | stdio: executable / arguments / extra environment variables (merged **on top of the already-scrubbed environment**) / working directory |
| `url` / `headers` | — | streamable-http: endpoint and extra request headers |
| `toolCallTimeoutMs` | — | default `60000` |
| `maxInstructionBytes` | — | default `32768`; beyond the limit the connection is refused |
| `failOnStartupError` | — | default `false`; when `true`, a failed first connect/sync **refuses plugin activation** |
| `reconnect.enabled` / `.initialDelayMs` / `.maxDelayMs` / `.maxAttempts` | — | default `true` / `500` / `30000` / `10` |

## Two things that do not change with the version

- The tool name shape `mcp__<serverName>__<rawName>` (e.g. `mcp__demo__ping`)——use it to verify whether the connection is up;
- **Environment credentials are scrubbed**: to reference existing credentials use Loader `!!js`; do not write secrets into the conversation text.
