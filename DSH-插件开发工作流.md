# 工作流：从"要做一个东西"到"它真的能跑"

> 中文 ｜ [English](DSH-插件开发工作流.en.md)

> 这份文档不讲 API，只讲**动作顺序**。
> 配套的 API 细节在 [DSH-插件开发指南.md](DSH-插件开发指南.md)。
>
> **它要解决的是一个具体毛病**：拿着一个模糊想法就开始写代码，写到一半发现槽位不存在、服务签名猜错、
> 导出名没有，于是在"改一点—重启—再看一眼"里反复死磕，最后文档里堆满"未定论""可能是""实测不一定"。
>
> **根因不是不努力，是顺序错了**：先用想象写代码，再用运行结果反推事实。
> 正确顺序是：**先拿到可归因的事实，再写代码，最后用互相印证的判据验证。**

---

## 0. 一句话版本

```
先问"我怎么知道" → 再查（可复制一份到 _ref）→ 再写 → 再用多个判据互相印证 → 才敢下结论
```

**没有能区分归因的证据时，"试出来了"不算结论。** 这句话是整份工作流的地基。

---

## 1. 七个阶段

| 阶段 | 你要产出什么 | 什么时候算完 |
|---|---|---|
| 1. 定题 | 一句话结果 + 目标位置 + 成功判据 | 能回答"用户看到什么/调用什么算成功" |
| 2. 取证 | 每个要用到的名字都有出处 | 名字全部来自查询结果，而不是记忆 |
| 3. 抄参考 | `_ref/` 里有一份能读的参考实现 | 至少读过一个同类实现的源码或 README |
| 4. 落笔 | 语法正确、一次写对的代码 | `node --check` 通过 + manifest 自检通过 |
| 5. 安装 | `application: applied` + `warnings: []` | 两个字段都干净 |
| 6. 验证 | 按风险走够验证层（§6） | 有活体证据，不只是"装上了" |
| 7. 收尾 | 结论写清来源；不确定的写成判据 | 手册里没有"可能""大概""未定论" |

**禁止跨阶段**：不要在第 2 阶段没做完时进第 4 阶段。90% 的死磕都发生在这条界线被跨过的时候。

---

## 2. 阶段 2 取证：把"记忆"换成"查询"

DSH 把该问的东西全做成了**可查询接口**（`cordis_inspect_list` 先看有哪些 provider）：

| 你要写的东西 | 必须先查 | 查不到会怎样 |
|---|---|---|
| 界面 | `Slots.listSubTree { root }` | 槽位不存在 / props 猜错 |
| Host 逻辑 | `Service.listService { service }` | 方法名、参数、返回值猜错 |
| 事件监听 | `Event.listEvents` | 用错分发模式（waterfall 忘 `next()` 会短路整条链） |
| 工具 | `Tool.listTools` + 目标服务的签名 | 参数形状错、白设计表达不出来的约束 |
| 主题样式 | `Theme.listTokens` | 硬编码颜色，明暗切换就崩 |
| 内置符号 | `Builtin.listBuiltins` | 用了不存在的注入 |
| 配置 | `Config.listConfigs { name }` / `{ entry }` | 配置字段名错，或写出"形状不对的 Config" |

**三条硬规则：**

1. **每个标识符都要有出处。** 槽位名、props 名、方法名、导出名 —— 全部来自查询结果或随包源码。
   凭记忆写的名字，错了不会响亮失败（`require` 返回 `undefined` → 整个槽位白屏），成本极高。
2. **`Tool` provider 不能调用工具。** 要验证工具行为，**派一个子代理去调**（给它精确的参数与"原样回报"的指令）。
   这是本文档里两条工具结论的来源。
3. **查不到 ≠ 不存在。** 没有描述的自家服务不进 `listService`；这时去读随包源码。

---

## 3. 阶段 3 抄参考：`_ref/` 协议

**任何插件/组件，动手前先把相关文档与参考实现复制一份到工作区的 `_ref/` 下。**

理由很实际：DSH 的包文档与 `.d.ts` **在 `app.asar` 里**，`cat` / `rg` / `node` / `pnpm`
都读不进去（它们不是普通文件）。把它解出来，之后就是普通文件，随便读、随便搜、随便对照。

### 3.1 解包脚本（存成 `_ref/_tools/asar-extract.js`）

```js
// 解 asar：extract(src, <asar 内路径>, <目标目录>)
// 头布局：[0..4) 常量 4 ｜ [4..8) pickle 总长 ｜ [8..12) 比 JSON 长度大 4 ｜ [12..16) JSON 长度
import fs from 'node:fs'
import path from 'node:path'

const [file, target, outDir] = process.argv.slice(2)
const fd = fs.openSync(file, 'r')
const head = Buffer.alloc(16)
fs.readSync(fd, head, 0, 16, 0)
const jsonLen = head.readUInt32LE(12)          // ← 读 offset 12
const raw = Buffer.alloc(jsonLen)
fs.readSync(fd, raw, 0, jsonLen, 16)
const tree = JSON.parse(raw.toString('utf8'))  // ← 正好完整 JSON，不需要 trim
const dataStart = 16 + jsonLen                 // ← 数据区起点

let n = 0
const walk = (node, prefix) => {
  for (const [name, child] of Object.entries(node.files ?? {})) {
    const p = `${prefix}/${name}`
    if (child.files) { walk(child, p); continue }
    if (!(p === target || p.startsWith(`${target}/`))) continue
    const rel = p === target ? path.basename(p) : p.slice(target.length + 1)
    const dest = path.join(outDir, rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    const buf = Buffer.alloc(Number(child.size))
    fs.readSync(fd, buf, 0, buf.length, dataStart + Number(child.offset))  // offset 是字符串，要转数字
    fs.writeFileSync(dest, buf)
    n++
  }
}
walk(tree, '')
fs.closeSync(fd)
console.log(`extracted ${n} files -> ${outDir}`)
```

用法（`<安装目录>` 是含 `DeepSeek Harness.exe` 的那层）：

```sh
node _ref/_tools/asar-extract.js "<安装目录>/resources/app.asar" \
     "/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace" \
     "_ref/ui-workspace"
```

### 3.2 该抄哪些

| 你要做的 | 抄这份 |
|---|---|
| **一个两半齐全、能直接装上跑的起点** | **`版本快照/<版本>/最小实现/demo-plugin/`**（工具 + 带鉴权路由 + 真实槽位 + locale 兜底） |
| 会出现在界面上的东西 | 声明那个槽位的包（如 `dsh-client-ui-workspace`）—— 看它自己怎么注册同类条目 |
| Host 服务用法 | 用那个服务的包（如 `dsh-workspace`、`dsh-session-projection-cache`） |
| 工具写法 | 任意 `dsh-tool-*` 包（如 `dsh-tool-todo`） |
| 完整的插件骨架 | `@deepseek-ai/dsh-agent-preset/skills/cordis-plugin-development/` 下的 `templates/` 与 `references/` |
| 组合/patch 写法 | `@deepseek-ai/dsh-base` 与 `@deepseek-ai/dsh-web-app` 的 `cordis.patch.yml` |

### 3.3 三个目录别搞混

| 目录 | 里面是什么 | 谁建的 | 生命周期 |
|---|---|---|---|
| `_ref/` | **你这次**要抄的参考实现（解出来的包、前端产物、探针脚本） | 你，动手前 | 用完即弃，可随时删 |
| `版本快照/<版本>/` | 手册作者在**某个版本**查到的值（ownerProps、种子表、字段表、诊断原文、最小实现） | 手册维护者，随版本归档 | 跟着那一版走；升级后重新取证并存新版 |
| 你的插件目录 | 交付物 | 你 | 长期 |

**判断一个值该放哪**：它会不会因为别人升级 DSH 而变？
会 → 只能出现在 `_ref/` 或 `版本快照/`，**正文里只留"去哪查"**（§8.1）。

### 3.4 抄完要做的三件事

1. **读 README 的"实现内部"折叠段**：随包 README 往往直接给出该包的 slot 声明、hook 契约与注意事项。
2. **读它的 `lib/*.js` 里的 JSDoc**：asar 内**没有 `.d.ts`**，类型信息只在 JSDoc 与源码里。
3. **把"它怎么做的"变成"我照着做的清单"**，而不是"我猜它可能这么做"。

> `_ref/` 是参考区，不是交付物。可以随时删；但**动手前必须有**。

---

## 4. 阶段 4 落笔：一次写对的清单

落笔前逐条打勾（详细解释见开发指南对应章节）：

- [ ] 我要 import 的包，**在解析路径上吗**？（profile 装法默认不在 → 零 import 写法）
- [ ] `Config` 我**要么**用原生 schemastery，**要么**干脆不导出
- [ ] `peerDependencies` 我**要么**不声明，**要么**钉精确版本（写错范围会被整包拦下）
- [ ] 每个槽位名、props 名、方法名都来自查询结果
- [ ] Client 的解构名**核对过确实存在**（否则白屏整个槽位）
- [ ] 文案走 locale 服务；样式只用 `--dsw-alias-*`
- [ ] `locale/<lang>.json` 用的是**嵌套**形状 `{"meta":{title,description}}`（扁平会被静默忽略）
- [ ] 手写 JSON Schema 注册的工具：`execute` 里**自己校验参数**（注册表不校验）
- [ ] 自建 HTTP 路由：**第一行**就是鉴权，失败关闭
- [ ] 每个注册都包在 `ctx.effect` / `ctx.on` 里（卸载才干净）
- [ ] `node --check` 每个 JS 文件通过

**能自动查的不要靠眼睛**（工作流第 4 步的机检）：

```sh
node 版本快照/0.2.0-rc.2/_tools/清单自检.mjs <你的插件目录>
```

它专抓**不报错的静默失败**：`main`/`exports` 指向的文件不存在、`files` 列了不存在的路径、
`locale/*.json` 用了扁平形状、`dsh.client` 声明了却没有 `./client`、client 的 `load({ id })`
与包名不一致、`dsh.bundle.patch` 不存在。**全过才进第 5 步安装。**

**写工具时的返回形态**（最容易搞错的一处）：参数不可用/执行异常 → `throw`；
"合法但被拒绝"或"执行后失败" → 返回**文本 + 下一步**；被取消 → **什么都不做**。

---

## 5. 阶段 5 安装：只认那两个字段

```
plugin_manager { action: "install_bundle", target: "<包目录绝对路径>" }
```

- `application: "applied"` **且** `warnings: []` 才算装上了。
- 失败了读返回里带 stack 的 `diagnostic`。`failed to import` 是兜底文案，不含原因。
- 已装过同一个包时再装会报 `ambiguous-install` —— **先 `remove_bundle`**。
- 想改代码不重启：把源码目录加进 `hmr` 行的 `config.root`（§6.3）。

**不要**用面板文案、终端输出、进程列表或日志推断生效状态。桌面端日志目录是空的。

---

## 6. 阶段 6 验证：按风险选层，并**互相印证**

| 层 | 手段 | 能证明什么 |
|---|---|---|
| 1 | `node --check` | 语法 |
| 2 | manifest / `Config` 形状 / peer 范围自检 | 可安装性 |
| 3 | `application` / `warnings` / `diagnostic` | 这次生效了吗、为什么没生效 |
| 4 | `Config.listConfigs` 的 `status` | **模块加载 ≠ 激活成功** |
| 5 | 活体调用一次（工具/端点/无凭据探测） | 真能工作 |
| 6 | `Slots.listSubTree` 的 `occupants` | 注册进了树 |
| 7 | 浏览器里看一眼 | 用户看到什么 |

- **越危险越要往下走**：写端点、删数据、改权限 → 至少到第 5 层。
- **至少用两个独立判据**才算验证过。例：改路由鉴权后，既看"无凭据 POST 得到 401 + 自己的 JSON"，
  又看"不存在的路径得到 405"作对照 —— 前者证明拦截在前，后者证明那是你的 handler 在答。
- **区分归因**：`status` 能区分"模块加载"与"激活"；`fiberPhase` 能看行是否活跃；
  带 stack 的 `diagnostic` 能指出是哪一行代码抛的。选能区分的那一个。

**Client 半边改完必须刷新页面** —— 这条没有别的办法。

---

## 7. 阶段 7 卡住了怎么办：二分，不要瞎试

**遇到"没生效"，按这个顺序二分，每一步都缩小范围：**

1. **行激活了吗** → `Config.listConfigs { name }` 的 `status`。
   `inactive` = 行没起来；`absent` = 起来了但没导出 `Config`（正常）；`unsupported` = `Config` 形状不对。
2. **模块导入了吗** → 看安装返回的 `diagnostic` 有没有 stack。
   有 stack = 导入成功、`apply()` 里抛；`failed to import` 无 stack = `_init` 阶段抛。
3. **是哪一行抛的** → 读 stack；零 import 写法下，`_init` 里能抛的只有顶层代码与 `Config` 校验。
4. **注册进树了吗** → `Slots.listSubTree` 的 `occupants` / 工具用 `Tool.listTools`。
5. **还是旧代码吗** → 换过代码后：`hmr.root` 改一次文件；或重启。**别用"换路径"**（旧世代不卸载）。
6. **真的在跑吗** → 活体调用一次。

**二分原则**：每一步只改**一个**变量。同一个包、只删一行 import、只换 Config 形状 ——
这样才能把"结果变了"归因到那一个变量上。

> ❌ 反面做法：同时改路径、改包名、加 peer、改 import 形态，然后看"到底哪一下管用"。
> 这样即使成功了，你也不知道是为什么 —— 于是文档里只能写"实测可用，原因不明"。

---

## 8. 什么时候才敢写结论

| 证据 | 能写什么 |
|---|---|
| 单变量对照、结果可复现 | ✅ **事实**："删掉这一行 import 就能激活" |
| 随包文档/源码明写 | 📖 **机制**："Loader 调 `Config['~standard'].validate`" |
| 兜底文案、间接现象、无法区分归因 | ❌ **什么都别写**。改去补一次能区分的观测 |
| 试过单变量对照仍无法解释 | ⚠️ 写"**判据**"而不是"结论"：告诉读者怎么自己测出来 |

**写不出来的，就删掉。** 一份手册的价值来自"照着做一定对"，不来自"覆盖率"。
宁可少讲一个主题，也不要讲一个错的 —— 读者会拿它当依据。

### 8.1 手册里不要写"版本数据"

**上面那条规则有个更隐蔽的变体：把当时查到的值当成文档结论抄进手册。**

后果比"没写"更糟 —— 未来版本的读者会**照着一个过期的值去写代码**，而且不知道要复核。

| 类型 | 例子 | 该写在哪 |
|---|---|---|
| **机制 / 契约** | 注册由上下文拥有、`ctx.get` 是 strict 的、`oneOf` 与 `properties` 互斥、鉴权是路由自己的责任 | ✅ **写进手册**（不随版本变） |
| **版本数据** | 槽位名清单、令牌名清单、包导出名清单、config 字段与默认值、模块种子表成员、版本号 | ❌ **不写进手册**；在手册里改成"**查它的命令**" |
| **"作者那个版本查到的值"** | 某接口的接口体、某个包当时的一行输出 | ⚠️ 只能作为**举例**出现，且必须标注"这是某版本的快照，照你自己查到的写" |

**判断办法一句话**：
> 这个值会不会因为别人升级 DSH 而变？会 → 它是版本数据，手册里只留命令。

**顺带一条**：版本数据**不要留在手册正文里靠着"⚠️ 可能过期"来兜底**。读者会跳过警告。
正确做法是**结构上就不出现**——把值挪进 `_ref/`（它本来就是"某个版本的快照"，用完即弃），
正文只留"去哪查"。

---

## 9. 反面清单：这些动作一律不要

| 动作 | 为什么 |
|---|---|
| 凭记忆写槽位名 / 导出名 / 方法名 | 错了不响亮失败，代价是白屏或静默失效 |
| 直接"改一点—重启—再看一眼" | 这是**用运行结果反推事实**，会把 10 分钟的事拖成 2 小时 |
| 同时改多个变量再观察 | 就算成功也归因不了，写不进文档 |
| 用"换路径"强制换模块代 | 旧世代不卸载 → 半新半旧的运行时 |
| 把 `logger.warn` 当用户可见反馈 | 桌面端看不到日志，用户只会觉得"没反应" |
| 拿面板文案当生效判据 | 面板只反映"包被选中了"，不反映这次跑起来没有 |
| 给没验的东西加"应该/可能/大概" | 读者会当依据用；**要么验，要么删** |
| 造 mock HTML / 截图脚本来"证明" UI | 那不是运行中插件的验证 |

---

## 10. 一页流程卡

```
① 定题      结果一句话 + 目标位置 + 什么算成功
② 取证      inspect 查名字（Slots/Service/Event/Tool/Theme/Builtin/Config）
            每个标识符必须有出处；查不到就读源码
③ 抄参考    解 asar → _ref/<包名>/ → 读 README「实现内部」+ lib 的 JSDoc
④ 落笔      §4 十条清单打勾 + node --check
⑤ 安装      install_bundle → application:"applied" 且 warnings:[]
⑥ 验证      按风险走层；≥2 个独立判据互相印证；Client 改完刷新页面
⑦ 收尾      只写能归因的结论；不能归因的写成"判据"；其余删掉
            机制写进手册；版本数据只留"查它的命令"

卡住 → §7 的六步二分，每次只改一个变量

自检两问：这句"我是怎么知道的"？这个值"升级后会不会变"？
```

**最后一条，也是最容易被跳过的一条**：
写下来的每一句，都要能回答"**我是怎么知道的**"。
答不上来的那一句，就是上一版手册里那些"未定论"的来源。

**而第二问同样重要**：这个值会不会因为别人升级而变？会 —— 那它就不该被写死在手册里。
