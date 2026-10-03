# 版本快照 · `@deepseek-ai/dsh` `0.2.0-rc.2`

> 中文 ｜ [English](README.en.md)

> **这是什么**：作者在 `0.2.0-rc.2` 上**当场查到的值**。
>
> **它不是接口，也不是承诺。** 里面的每个名字、每个字段、每个默认值都会随版本变化。
> 正文（[DSH-插件开发指南.md](../../DSH-插件开发指南.md)）刻意不写这些值，只写"去哪查"——
> 这个文件夹就是那些查询结果的落脚点，**用完即弃、升级即重查**。
>
> **怎么用**：写代码卡在"这个名字/字段到底叫什么"时，先来这里**看一眼长什么样**，
> 然后用指南 §2.1 的 inspection 命令**在你自己的版本上重查一遍**。两者不一致时，
> **以你查到的为准**，并把这个文件夹里过时的那份删掉或另建 `版本快照/<新版本>/`。

| 文件 | 内容 | 正文对应章节 | 升级后怎么重查 |
|---|---|---|---|
| [种子表.md](种子表.md) | 浏览器 `require` 能解析到的模块 id → 导出 | §7.2 | 解 `dsh-web-frontend/dist`，在前端主 bundle 里搜 `react-dom/client` |
| [展示元信息-形状.md](展示元信息-形状.md) | `locale/<lang>.json` 必须嵌套 `meta`（扁平会被静默忽略）+ 三个"meta"的区别 | §0.2、§6.1 | 解 `dsh-app-boot` 读 `dictionariesOf()`；或改一次 `package.json.description` 看管理页显示哪个 |
| [mcp-client-字段.md](mcp-client-字段.md) | `dsh-mcp-client` 的 config 字段与默认值 | §3.6 | `Config.listConfigs { name: "@deepseek-ai/dsh-mcp-client" }` |
| [依赖解析.md](依赖解析.md) | **安装方式 × 裸 import 解析**：`link:` 装的工作区插件解析不到、tarball/registry 装进 profile 的可以；含 `exports` 键前缀静默失败 | §9.1、§6.1 | 在插件目录跑 `node -e "console.log(require.resolve('<包>'))"` |
| [槽位-ownerProps.md](槽位-ownerProps.md) | 两个槽位当时返回的 ownerProps 接口源码 | §7.5 | `Slots.listSubTree { root: "<槽位名>" }` 的 `catalog` |
| [诊断文案.md](诊断文案.md) | `application` / `status` / `diagnostic` 的原样输出 | §9.2、§10 | 制造一次失败，读安装返回的 `diagnostic` |
| [_tools/asar-extract.js](_tools/asar-extract.js) | asar 解包脚本（唯一能读随包文档的办法） | 工作流 §3.1 | 自带三条自检；读不出就换 `@electron/asar` |
| [_tools/清单自检.mjs](_tools/清单自检.mjs) | 落笔后的机检：路径/形状/id 一致性等**静默失败** | 工作流 §4、指南 §12.2 | 直接跑；配套版本升级后按新字段补规则 |
| [最小实现/demo-plugin/](最小实现/demo-plugin/) | 一个**两半齐全**的最小插件：工具 + 带鉴权路由 + 真实槽位 + locale 兜底。**本机实装并活体验证过**（记录见 [最小实现/README.md](最小实现/README.md)） | §0、§4.4、§5、§7 | 直接 `install_bundle` 它，按指南 §12.2 验证 |

**取证日期**：2026-10-03 ｜ **环境**：Windows 桌面端 + Web，Node 24。
