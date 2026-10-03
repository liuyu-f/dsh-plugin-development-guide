# 最小实现：`demo-plugin`

> 中文 ｜ [English](README.en.md)

一个**两半齐全、能装上、能看见**的最小插件。它存在的意义是当"抄这个起点"，
而不是让你从零拼片段。四个最容易做错的地方都在代码注释里指到了指南章节：

| 位置 | 演示的机制 | 指南 |
|---|---|---|
| `index.js` 顶部 | **零 `@deepseek-ai/*` import**，一切服务从 `ctx` 取 | §9.1 |
| `index.js` `rejectUnauthenticated` | 自建路由**第一行就鉴权**、失败关闭、逐请求读服务 | §4.4 |
| `index.js` `ctx.tools.register` | 写法 B（手写 JSON Schema）→ **注册表不校验参数**，`execute` 自己防 | §5.1、§5.2 |
| `index.js` `saveNote` | **一个操作一份实现**，工具与路由共调 | §5.5 |
| `client.js` `resolveText` | `locale: NS` 只给 `t`，**座位不翻译时回落内置字典** | §7.4 |
| `client.js` `shell.overlay` | 浮层走槽位，**不自己 portal 到 `document.body`** | §7.2、§7.3 |
| `client.js` `inputStyle` | 只用 `Theme.listTokens` 列出的 `--dsw-alias-*` | §7.3 |
| `package.json` | 清单最小集：`main` + `exports` + `dsh.bundle` + `dsh.client` | §6.1 |

## 它装上去是什么样

- 会话头部动作区多一个图标按钮：点击弹出一个"保存笔记"对话框（走 `shell.overlay`）；
- 对话框 POST 到 `/__demo/notes`（带鉴权）；
- agent 多一个工具 `demo_note_save`：`{ name, text }` 保存，只给 `{ name }` 则列出已有笔记；
- 笔记落在 `$DSH_HOME/demo-plugin/<name>.txt`。

## 怎么装、怎么验

```
plugin_manager { action: "install_bundle", target: "<这个目录的绝对路径>" }
```

然后按指南 §12.2 的梯度走：`application: "applied"` + `warnings: []` →
`Config.listConfigs { name: "@local/demo-plugin" }` 的 `status` 应为 `absent`（不导出 `Config`）→
`Slots.listSubTree { root: "conversation.session.header.utilities" }` 里应看到
`demo-plugin.note` 且 `active: true` → 无凭据 `POST /__demo/notes` 应得 **401 + 自己的 JSON** →
刷新页面点按钮。

> ⚠️ 这是 `0.2.0-rc.2` 的快照：槽位名、基元导出名、令牌名都可能在新版本变化。
> 落地你自己的插件时，**把里面每个名字都用 inspection 重查一遍**。

> **这几份文件不带署名，也不需要署名。** 它只是"这块业务无关的最小骨架长什么样"，
> 任何人照着规范都能写出差不多的东西。**直接拿走用、改、发，不必标明来自哪里**；
> 需要提出处的是这份**文档**（见仓库根 `README.md` 的许可一节），不是这段示例代码。

## 验证记录（`0.2.0-rc.2`，本机实装）

这份实现**真的装过、调过**，不是纸面代码：

| 步骤 | 结果 |
|---|---|
| 落笔机检 `_tools/清单自检.mjs` | `OK @local/demo-plugin: 清单自检通过` |
| `install_bundle` | `application: "applied"`、`warnings: []` |
| `Config.listConfigs { name }` | `status: "absent"`（不导出 `Config` = 预期形态） |
| 工具是否进了调用方工具表 | `demo_note_save` ✅（宿主半边确实注册了） |
| 活体调用（合法参数） | `saved verify-01 (52 bytes) at <DSH_HOME>/demo-plugin/verify-01.txt` —— 真的落盘 |
| 活体调用（只给 name） | `notes:` + `verify-01` —— 列表分支可用 |
| 活体调用（非法参数：中文名） | `save failed: invalid note name: "验证-第一次"` —— **错误结果而非异常**，形态正确 |
| `remove_bundle` | `application: "applied"`、无 warning；profile 清单干净恢复，测试数据已清 |
