# MCP client 字段表（`dsh-mcp-client` `0.2.0-rc.2` 快照）

> 中文 ｜ [English](mcp-client-fields.en.md)

字段与默认值属于**该包自己的版本数据**。落笔前用一条命令核对，比记表可靠：

```
Config.listConfigs { name: "@deepseek-ai/dsh-mcp-client" }
```

## 当时查到的字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `transport` | **是** | `stdio` 或 `streamable-http` |
| `serverName` | **是** | 工具名前缀；`[A-Za-z0-9_-]{1,32}`，**同一注册作用域内唯一**（不是远端 `serverInfo.name`） |
| `command` / `args` / `env` / `cwd` | — | stdio：可执行文件 / 参数 / 追加环境变量（在**已清洗的环境之上**合并）/ 工作目录 |
| `url` / `headers` | — | streamable-http：端点与额外请求头 |
| `toolCallTimeoutMs` | — | 默认 `60000` |
| `maxInstructionBytes` | — | 默认 `32768`；超限拒绝连接 |
| `failOnStartupError` | — | 默认 `false`；`true` 时初次连接/同步失败会**拒绝插件激活** |
| `reconnect.enabled` / `.initialDelayMs` / `.maxDelayMs` / `.maxAttempts` | — | 默认 `true` / `500` / `30000` / `10` |

## 不随版本变的两条

- 工具名形态 `mcp__<serverName>__<rawName>`（如 `mcp__demo__ping`）——拿它验证接上了没有；
- **环境凭据会被清洗**：引用既有凭据用 Loader `!!js`，不要把密钥写进对话文本。
