# DeepSeek Harness 插件开发指南

> 中文 ｜ [English](DSH-插件开发指南.en.md)

> **三类文件怎么分工**
>
> | 文件 | 里面是什么 | 什么时候读 |
> |---|---|---|
> | **本文**（机制与判据） | 清单怎么写、槽位怎么注册、工具怎么定义、坑在哪。**只写不随版本变的东西** | 写代码时对照 |
> | [**工作流：从查到写**](DSH-插件开发工作流.md)（动作顺序） | 七个阶段：定题 → 取证 → 抄参考（`_ref/`）→ 落笔 → 安装 → 验证 → 收尾 | **动手之前**读一遍 |
> | [**版本快照/**](版本快照/README.md)（某版本查到的值） | 槽位 ownerProps、种子表成员、某包字段表、诊断原文、**一个两半齐全的最小实现** | 想知道"这个名字/字段到底叫什么"时查一眼，然后**在你自己的版本上重查** |
>
> 只读本文容易变成"对着 API 试错"；只读工作流容易写错字段；**把快照当接口用**会在下个版本翻车。
> **本文不写版本数据，正文只在需要时给出指向 `版本快照/<版本>/` 的指针** ——
> 这是本文唯一的结构性纪律，理由见 §2.2。
>
> **基准运行时**：`@deepseek-ai/dsh` `0.2.0-rc.2`（Windows 桌面端 + Web）——**全文只此一处版本声明**。
> 其余地方的版本号只出现在**快照路径**里（`版本快照/<版本>/…`），或明确标了"当时（`<版本>`）"。
> 凡是会随版本漂移的东西（版本号、槽位名、导出名、路径），本文都给了**当场自查的命令**，
> 以你自己机器上的实测为准。
>
> **证据标记**
>
> | 标记 | 含义 |
> |---|---|
> | ✅ | 本机实测过，命令与输出可复现 |
> | 📖 | 来自随包文档或源码，未在本机复跑 |
> | ⚠️ | **风险提示**（不是"没把握"，而是"这么做有已知代价"） |
>
> **本文不保留"不确定"的条目**：查不清的要么删掉、要么就地给出**一条能查清的判据**。
> 想复现本文的每个结论，按 [工作流](DSH-插件开发工作流.md) 的 §3（`_ref/` 协议）与 §8（写到什么程度才敢下结论）走。

---

## 我要做什么 → 读哪一节

> **怎么用这张表**：左边找你的目标 → 右边按顺序读。**第一节永远是[工作流](DSH-插件开发工作流.md)**
> （动手前的动作顺序），其余按"先机制、后查值"排。
> "快照"列指 [`版本快照/<版本>/`](版本快照/) 里那份**某版本查到的值**，用法见 §2.2。

| 我要做的东西 | 读这里 | 快照 |
|---|---|---|
| **第一次上手**：装上、看见、确认它活着 | 本文 §0；[工作流](DSH-插件开发工作流.md) 全篇 | [最小实现](版本快照/0.2.0-rc.2/最小实现/demo-plugin/) |
| 纯 Host 插件（不碰界面） | §3.1 → §8（服务/投影/事件/定时） | — |
| 加界面：一个按钮 / 一行菜单 / 一个浮层 | §3.2 → §7.2（lane 与种子表）→ §7.5（槽位注册）→ §7.3（样式） | [种子表](版本快照/0.2.0-rc.2/种子表.md)、[槽位-ownerProps](版本快照/0.2.0-rc.2/槽位-ownerProps.md) |
| 界面上的文字要跟语言走 / 出现裸键名 | §7.4 | — |
| 加一个 agent 工具 | §5（**§5.2 参数校验必读**） | — |
| 加一条自己的 HTTP 端点 | §4.4（**鉴权必读**） | — |
| 加提示词 / 运行时上下文 / 定时唤醒 | §3.5 | — |
| 接 MCP server（纯配置，无代码） | §3.6 | [mcp-client-字段](版本快照/0.2.0-rc.2/mcp-client-字段.md) |
| 定义一套 Agent preset | §3.7 | — |
| **改/删宿主自己的状态**（最容易出事） | §4.7 + §11（单一写入者）+ §5.5（拒不得核销自身） | — |
| 想给插件加个可调开关 | §9.4（`Config` 形状与"宁可不写"） | — |
| 清单字段、patch 语义、安装/换代/卸载 | §6 全节 | — |
| **"改了没生效" / "装了没起来"** | §10 排障索引 → §6.3（模块代）→ §9.2（诊断入口） | [诊断文案](版本快照/0.2.0-rc.2/诊断文案.md) |
| 想知道某个名字/字段/导出到底叫什么 | §2.1（inspection 速查） | 对应快照文件 |
| 想读随包文档 / 源码 / 类型 | [工作流](DSH-插件开发工作流.md) §3（`_ref/` 协议） | [_tools/asar-extract.js](版本快照/0.2.0-rc.2/_tools/asar-extract.js) |
| **交付前**：一次跑完能自动查的 | §12（验收清单与验证梯度） | [_tools/清单自检.mjs](版本快照/0.2.0-rc.2/_tools/清单自检.mjs) |
| 写文档 / 下结论时的纪律 | §14 方法论；[工作流](DSH-插件开发工作流.md) §8 | — |

---

## 0. 五分钟：一个能装上、能看见的最小插件

> 本节的五个文件是**片段式**的骨架。**完整的两半实现（工具 + 带鉴权路由 + 真实槽位 + locale 兜底）
> 在快照夹里，可以直接装上去跑**：[`版本快照/0.2.0-rc.2/最小实现/demo-plugin/`](版本快照/0.2.0-rc.2/最小实现/demo-plugin/)。
> 它同样是**快照**：里面每个槽位名/导出名/令牌名都要在你自己的版本上重查。

### 0.1 目录

```
my-plugin/
├── package.json        清单：dsh.bundle（+ 有界面时 dsh.client）
├── cordis.patch.yml    把你的插件行插进 Loader 组合
├── index.js            Host 半边
├── client.js           浏览器半边（没有界面就删掉）
├── icon.svg            插件管理页图标
└── locale/
    ├── zh.json         管理页标题/描述：{"meta":{"title":…,"description":…}} ← 必须嵌套
    └── en.json         （与运行时文案是两回事，运行时文案见 §7.4）
```

### 0.2 五个文件

**`package.json`**

```json
{
  "name": "@local/my-plugin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "index.js",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./package.json": "./package.json",
    "./locale/*.json": "./locale/*.json"
  },
  "files": ["index.js", "client.js", "locale", "icon.svg", "cordis.patch.yml"],
  "icon": "./icon.svg",
  "meta": { "title": "My Plugin", "description": "在输入框下方显示一行字。" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web" }
  }
}
```

- `main` + `exports["."]`：Host 入口。**必须有**（缺了就是"装了但从不激活"）。
- `exports["./client"]`：浏览器半边入口。没有 UI 就整段删掉。
- `exports["./package.json"]`：设置页/管理页要读清单。
- `icon` + `meta`：**不激活插件**也能读到的展示信息（§6.1）。
- **不要**为了"规范"抄别人的 `peerDependencies`：它是可选的，写错范围反而会让整包被拦（§9.3）。

**`cordis.patch.yml`**

```yaml
- insert:
    - id: my-plugin          # 行 id：稳定，供更高优先级的 patch 定位
      name: "@local/my-plugin"  # 包名，不是路径
```

**`index.js`**（Host 半边）

```js
export function apply(ctx, config) {
  // 需要什么服务就声明什么：export const inject = ['tools']
  // 可选服务用 ctx.inject(['x'], (sub) => ...)，不要写进 inject
}
```

**`client.js`**（浏览器半边）

```js
window.__ModuleLoader__.load({
  id: "@local/my-plugin", // ← 必须与 package.json 的 name 完全一致
  factory(require) {
    const React = require("react");
    const h = React.createElement;
    const NS = "myPlugin";
    const zh = { greeting: "你好，插件" };
    const en = { greeting: "Hello, plugin" };

    function Badge(props) {
      const t = typeof props.t === "function" ? props.t : (k) => zh[k] ?? k;
      return h("div", {
        style: { padding: "2px 8px", fontSize: 12, color: "var(--dsw-alias-label-secondary)" },
      }, t("greeting"));
    }

    function apply(ctx) {
      // `locale: NS` 只给组件注入 t；字典必须自己注册，否则界面显示裸键名（§7.4）
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "my-plugin: dictionaries");
      // ⚠️ 这里的槽位名只是个例子：落笔前先 Slots.listSubTree 确认它 available（§3.2）
      ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
        name: "conversation.composer.dock",
        id: "myPluginBadge",
        order: 10,
        locale: NS,
      }, Badge));
    }

    return { inject: ["slots", "locale"], apply };
  },
});
```

**`locale/zh.json`**（`en.json` 同结构）

```json
{ "meta": { "title": "我的插件", "description": "在输入框下方显示一行字。" } }
```

> ⚠️ **必须嵌套在 `meta` 里。** 顶上直接写 `title` / `description` 的扁平形状
> **不报错但整份被忽略**——读取器只取 `parsed.meta`，于是显示悄悄回落到 `package.json` 的
> `name` / `description`。这和 **`package.json` 自己的 `meta` 字段（那是扁平的）形状不同**，
> 是本文档最容易写错的一处。

### 0.3 装上去，确认它真的活着

```
plugin_manager { action: "install_bundle", target: "<这个目录的绝对路径>" }
```

然后**按顺序**看四件事（缺一不可）：

| 判据 | 期望 | 说明 |
|---|---|---|
| 安装返回的 `application` | `"applied"` | `failed` / `restart-required` 都要处理 |
| 安装返回的 `warnings` | `[]` | 非空就照它修 |
| `Config.listConfigs { name: "<包名>" }` 的 `status` | `absent`（= 没导出 `Config`，正常）或 `schema` | **`inactive` = 行没激活；`unsupported` = `Config` 形状不对**（§9.4） |
| `Slots.listSubTree { root: "conversation.composer.dock" }` 的 `selected.occupants` | 有你的 `id` 且 `active: true` | 证明注册成功 |

**刷新页面**才能看到画出来的样子。**不要**拿面板文案、终端输出或日志替代上面四条。

### 0.4 接下来一定会撞上的四件事

1. **改完代码没生效** → 同进程内一个模块只求值一次。加 `hmr` 监视目录，或重启（§6.3）。
2. **同一个包想重装** → 已装状态下再 `install_bundle` 报 `ambiguous-install`，**先卸载**（§6.4）。
3. **想看真错误** → 读返回里的 `diagnostic`（带 stack）；`failed to import` 只是兜底文案（§9.2）。
4. **想做界面却找不到槽位** → 先查 `Slots.listSubTree`，再写代码（§3.2、§7.5）。

### 0.5 别急着照抄：先走一遍流程

上面这个例子是**成品**，不是**起点**。真正开始做你自己的插件时，先读
[工作流：从查到写](DSH-插件开发工作流.md) —— 它把"怎么问、抄哪份参考、什么时候才算验证过"
写成七个阶段，并给出卡住时的六步二分法。**这一步能省掉的返工，远多于它花掉的十分钟。**

两个必须先建立的习惯：

- **动手前先把相关文档与参考实现解到 `_ref/`**（随包文档在 `app.asar` 里，普通命令读不到）——
  工作流 §3 给了可直接存下来用的解包脚本；
- **每个名字（槽位/方法/导出）都要有出处**，不要凭记忆写 —— 写错不会响亮失败，只会白屏或静默失效。

---

## 1. 心智模型

DSH 的插件体系是 **Cordis**。只需五件事：

**① 插件 = 一个带 `apply` 的模块**（或一个 Service 子类）

```js
export function apply(ctx, config) {}
export const inject = ['tools']   // 可选：硬依赖
// export const Config = ...      // 可选：见 §9.4，profile 插件通常不要写
```

**② `ctx` = 服务容器。** 服务占据稳定的 key（`ctx.tools` / `ctx.sessions` / `ctx.slots` …）。
插件**通过 key 查找服务，不 import 实现**（§9.1 会解释为什么这条在本运行时里格外重要）。

**③ 依赖分硬/软**

```js
export const inject = ['tools']              // 硬依赖：等它就绪才启动；缺了插件不启动
ctx.inject(['webServer'], (sub) => { ... })  // 软依赖：有就做，没有就安静跳过
```

`ctx.get(name)` 是 **strict 的**：只返回"提供方 fiber 已 active"的服务，异步激活的服务在 `apply` 时
拿到 `undefined`。所以**软依赖一律用 `ctx.inject`**，只有"每次请求都要重新解析"的场景才用 `ctx.get`（§8.1）。

> ⚠️ **不要写"`ctx.get` 快路径 + `ctx.inject` 兜底"两条分支**：两条分支把 effect 挂在**不同的 ctx** 上，
> 生命周期语义不同（一条跟随插件，一条跟随服务），卸载时会漏。

**④ 注册 = 可逆副作用。** 工具、槽位、路由、监听器、定时器都用 `ctx.effect()` / `ctx.on()` 安装：

```js
ctx.effect(() => ctx.tools.register(def), 'my-plugin: tool')
ctx.effect(() => {
  const id = setInterval(tick, 5000)
  return () => clearInterval(id)
})
```

返回的 disposer 由**拥有者上下文**在卸载/热重载/禁用时调用 —— 这是插件不泄漏的全部依据。

**⑤ 事件有五种分发模式**（`cordis_inspect_query` provider `Event` 可查每个事件的模式）：

| 模式 | 是否 await | 顺序 | 返回值 |
|---|---|---|---|
| `emit` | 否 | 注册序 | 否 |
| `waterfall` | 否 | 环绕中间件 | 是 |
| `parallel` | 是 | 全并行 | 否 |
| `serial` | 是 | 注册序 | 是 |
| `bail` | 否 | 注册序，遇 bail 值停 | 是 |

`waterfall` 监听器收到 `(...args, next)`。**只有拥有该决策的监听器可以短路；只观察的必须 `return next()`。**

### 1.1 六条设计原则

1. **会话日志是唯一真相源。** 模型能看到的一切都要能从已提交的会话事件重建（fork/resume/replay 都从日志派生）。插件内存只是派生缓存。
2. **注册由上下文拥有。** 先选好拥有者；注册在别人的上下文（如 `agent.ctx`）上时**有两个拥有者**，把 disposer 也留在自己的 effect 里。
3. **框架驱动，插件计算。** 会话投影、Conversation 装配、槽位渲染已经替你订阅、缓存、发布。自己订阅/重扫/写 DOM 就绕过了增量机制。
4. **扩展点共享，用够用的最弱机制。** `ctx.tools.restrict()`（只能移除）→ `ctx.tools.guard()`（只能拒绝）→ waterfall（可改写，依赖顺序）→ `system-prompt/assemble`（替换整个装配）。
5. **别的插件和别的版本会读你写的数据。** 按信封字段与版本声明兼容性；**不要**用新 `type` 追加会话事件（§8.3）。
6. **插件 UI 就是 Harness UI 的一部分。** 用宿主的主题令牌、locale、布局模式。**先选渲染面，再写视图** —— 选错面后面调样式救不回来。

---

## 2. 动手前：12 项检查

| # | 检查 | 怎么查 | 不做的后果 |
|---|---|---|---|
| 1 | 目标 slot 存在，且知道它的 props | `Slots.listSubTree { root }` | 写完才发现槽位不存在/拿不到数据 |
| 2 | 要调的 Host 服务方法签名 | `Service.listService { service }` | 方法名、参数猜错 |
| 3 | 要监听的事件名与**分发模式** | `Event.listEvents` | waterfall 忘 `next()` 会短路整条链 |
| 4 | 你要 import 的包**在不在解析路径上** | §9.1 的规则 | 裸 import `@deepseek-ai/*` → 整行导入失败 |
| 5 | 要用 `ctx.get` 还是 `ctx.inject` | 该服务的 `access.optional` 字段 | 异步激活的服务取不到 |
| 6 | Client 要用的模块在不在**平台种子表** | §7.2 | `require` 返回 `undefined` → 白屏整个槽位 |
| 7 | Client 半边属于哪个 **lane** | §7.2 的分 lane 表 | 在该 lane 里被禁的 import 写进去 → 白屏 |
| 8 | 可见文案的命名空间与字典 | §7.4 | 界面显示裸键名 |
| 9 | 自建 Web 路由的**鉴权** | §4.4 | **任意网页可操作你的插件** |
| 10 | 工具参数约束**能不能表达** | §5.3 | 白设计一个表达不出来的约束 |
| 11 | 改完要不要重启 / 刷新 | §6.3 | 以为生效了，其实没有 |
| 12 | 参考实现的源码目录 | `Config.listConfigs { entry }` 的 `packageDir` | 从 `$DSH_PROFILE_DIR` 猜路径，找不到 |

> 第 12 项的前提：**只有导出原生 `Config` 的行才有 `packageDir`**。本指南推荐的写法（不导出 `Config`）
> 会让它为空 —— 那时直接读你自己的插件目录，或用 §9.5 的探针从安装目录取。

### 2.1 inspection 速查

```
cordis_inspect_list                      # 先看有哪些 provider
```

| 想知道 | platform | provider | method |
|---|---|---|---|
| 服务与方法签名 | host | `Service` | `listService`（传 `service` 看详情） |
| 事件名与分发模式 | host | `Event` | `listEvents` |
| 插件 Config JSON Schema | host | `Config` | `listConfigs`（先按 `name` 过滤，再查 `entry`） |
| 我能调的工具 | host | `Tool` | `listTools`（**只能列 schema，不能调用**） |
| slot 树 / props / occupants | client | `Slots` | `listSubTree`（传 `root`） |
| 主题令牌 | client | `Theme` | `listTokens` |
| Client 可用内置符号 | client | `Builtin` | `listBuiltins` |

> ✅ `Tool` provider **没有**"调用"方法。要验证某个工具的真实行为，只能**通过 agent 调用**
> —— 本会话里没有它时，**派一个子代理去调**（本文两条工具结论就是这么测出来的，见 §5.2、§5.4）。

### 2.2 哪些是"版本数据"，哪些是"长期事实"

**本文刻意只写后者。** 前者的正确做法是**当场查**，不是抄进代码或笔记。
下面这张表本身就是这套文档的使用方法 —— 请把"记名字"的冲动换成"跑一条命令"：

| 版本数据（**不要记，要查**） | 查它的命令 |
|---|---|
| 槽位名、槽位在不在、它的 props / hooks | `Slots.listSubTree { root }`（看 `purpose` 选位置） |
| 平台种子表的成员、某个导出在不在 | §9.5 探针解出前端产物后读种子对象；导出名做一次存在性检查 |
| 主题令牌名 | `Theme.listTokens` |
| 服务的方法签名、参数、返回值 | `Service.listService { service }` |
| 事件名与分发模式 | `Event.listEvents` |
| 某个包的 config 字段与默认值 | `Config.listConfigs { name }` / `{ entry }` |
| 工具 schema 的参数关键字词汇表 | 读 `dsh-tools` 的 schema 编译器（写法 A）/ 自查（写法 B，§5.1、§5.3） |
| 运行时里有哪些包、什么版本 | §9.5 的 asar 探针 |
| 某个包的实现细节与内部约定 | 按工作流 §3 解到 `_ref/` 读 README 与 `lib/*.js` |
| Client 闭包能拿到的注入 | `Builtin.listBuiltins` |
| 组合层序、patch 语义、安装/换代/卸载流程 | **长期事实**，见 §6（机制不随版本改名） |
| `ctx.effect` / `ctx.inject` / 注册的所有权模型 | **长期事实**，见 §1（写法不随版本变） |

**两条使用纪律：**

1. 你在本文里读到任何**具体名字**（槽位名、令牌名、导出名、字段名），都把它当作
   "**作者在那个版本查到的值**"，落笔前用上表对应的命令再查一次。
2. 反过来，本文里**没有**列出的清单（槽位全表、令牌全表、导出全表）是**故意不列**的 ——
   写死一张会过期的表，比不写更糟：读者会以为那是接口。

**版本数据住在哪里：`版本快照/<版本>/`。**

本文需要举例说明"它长什么样"时（例如某个槽位的 `ownerProps` 接口、某条诊断原文），
**只有两种写法允许**：

- **指针**：`→ 版本快照/<版本>/<文件>.md`（正文不出现值）；
- **就地举例 + 明确标注**"这是某版本的快照，照你自己查到的写"。

不允许的第三种写法：把值留在正文里、靠一句"⚠️ 可能过期"兜底。**读者会跳过警告。**
正确做法是**结构上就不出现** —— 值挪进快照夹，正文只留"去哪查"。

> 快照夹是"某个版本的查询结果"，`_ref/` 是"你这次要抄的参考实现"，两者都**不是交付物**：
> 用完即弃、升级即重查。区别只在于前者按版本归档、后者按本次任务临时建。

---

## 3. 配方：按你要做的东西挑一条

每条配方都自包含：清单片段 → patch 片段 → 代码 → 验证。

### 3.1 纯 Host 插件（不碰界面）

最小清单（**不需要**依赖、构建脚本或构建工具）：

```json
{
  "name": "@local/my-host-only",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "index.js",
  "exports": { ".": "./index.js" },
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

`index.js` 按 §8 的规则写；没有 `dsh.client`、没有 `client.js`。

### 3.2 加界面：Client 半边 + 槽位

1. 清单加 `exports["./client"]` 与 `dsh.client`（见 §0.2）；
2. 用 `Slots.listSubTree { root }` 找到**已经分配好空间**的槽位；
3. 写 `client.js`：注册 factory → `apply(ctx)` 里 `ctx.slots.inject` + `ctx.slots.register`；
4. 文案走 locale（§7.4）；样式只用 `--dsw-alias-*` 令牌。

**怎么找槽位（不要靠记名字）**：

```
Slots.listSubTree                       # 不带 root：看整棵槽位树，找"该放这东西的位置"
```

`listSubTree` 给每个槽位带 **`purpose`（这个位置是干什么的）**、`kind`、`scope`、
`replaceRisk` 与 `registration` 契约。**按 `purpose` 挑，而不是按名字猜** ——
名字只说明它在树上的位置。

> ⚠️ **槽位名是"某个包里声明的"**，不是 DSH 的固定接口。换 composition（装/卸别的 bundle）
> 可能就没有了，版本升级也可能改名。所以：**先用 `listSubTree` 确认 `available: true` 再写代码**，
> 并且用 `ctx.slots.inject()`（它等声明出现、声明消失时自动摘掉你的条目）而不是裸 `register`。
>
> 本文**不列"常用槽位名"清单**：那是版本数据，写死会误导。你要的位置在 `listSubTree` 的
> `purpose` 里一眼就能找到（例如"会话行 '...' 菜单的行"这类描述）。
> 想抄现成写法，按工作流 §3 解出声明该槽位的包，看它自己怎么注册同类条目。

### 3.3 加一个 agent 工具

见 §5（含**必读**的参数校验真相）。

### 3.4 加一个 HTTP 端点

见 §4.4（含**必读**的鉴权）。

### 3.5 加提示词 / 上下文 / 定时唤醒

两个接口形状已核实（✅ `Service.listService { service: "systemPrompt" }`）：

```ts
interface PromptSection {
  readonly name: string
  readonly order: number                                    // 必填，非有限值会抛
  readonly text: string | ((ctx: AssembleContext) => string)
  readonly interpolate?: boolean
  readonly complete?: boolean                               // true = 成为唯一提示段落
}
interface PromptContext {
  readonly name: string
  readonly order: number
  readonly text: string | ((ctx: AssembleContext) => string)
}
// AssembleContext = { scope?: ScopeKey; signal?: AbortSignal }
```

```js
ctx.systemPrompt.section({ name: 'my-section', order: 100, text: () => '...' })  // 提示词段落
ctx.systemPrompt.context({ name: 'my-ctx',     order: 100, text: () => '...' })  // 运行时上下文
```

- 同名时**本上下文的作用域遮蔽全局**；同一层里重名或 order 非有限值会抛。
- 两个注册都返回 disposer，也都会触发 `system-prompt/change`。
- 想按名字要"仓库预设的顺序"用 `getSectionOrder(name)` / `getContextOrder(name)`。
- 想要"模型可调用的工具"用 `ctx.tools.register`（§5），**不要**用 `systemPrompt.tools()` 去塞工具 schema。
- per-agent 的注册在 `agent/created` 里拿 `agent.ctx` 做（§4.1）。

**定时与唤醒**：

- 起工作的定时器要调 `agent.followup()`（**唤醒** agent）；`agent.inject()` **不唤醒**，注入的上下文可能一直等在 inbox。
- 定时器必须在拥有它的 effect 里清掉。
- 不要为加工具/文本去监听 `system-prompt/assemble`（那是"专家级 waterfall"，最强机制）。

### 3.6 接 MCP server（纯配置，无代码）

manifest 只需 `name` / `version` / `dsh.bundle.patch`，**不需要入口文件**。

```yaml
- insert:
    - id: demo-mcp
      name: "@deepseek-ai/dsh-mcp-client"
      config:
        serverName: demo                 # 必填
        transport: streamable-http       # 必填：stdio 或 streamable-http
        url: http://127.0.0.1:3000/mcp   # streamable-http 用
        # command: node                  # stdio 用（可选 args / env / cwd）
        failOnStartupError: true         # 默认 false
```

**字段与默认值属于该包自己的版本数据**，落笔前用一条命令核对（比记表可靠）：

```
Config.listConfigs { name: "@deepseek-ai/dsh-mcp-client" }
```

当时（`0.2.0-rc.2`）查到的字段表 → [`版本快照/0.2.0-rc.2/mcp-client-字段.md`](版本快照/0.2.0-rc.2/mcp-client-字段.md)。
**不要把那张表当接口抄进代码**：只要两句是长期事实 ——

- 工具名形态 `mcp__<serverName>__<rawName>`（如 `mcp__demo__ping`），拿它验证接上了没有；
- **环境凭据会被清洗**：引用既有凭据用 Loader `!!js`，不要把密钥写进对话文本。

### 3.7 Agent preset（定义一套 Agent 能力组合）

preset 是 `@deepseek-ai/dsh-agent-preset` 承载的**普通声明**，由组合包 patch 携带；没有东西就地编辑它。

```yaml
- insert:
    - id: preset-review                 # Loader 行 id 约定为 preset-<id>
      name: "@deepseek-ai/dsh-agent-preset"
      config:
        id: review                      # 必填
        name: Review                    # 可选
        description: Reviews changes.   # 可选
        order: 10                       # 可选
        plugins:                        # 必填：Cordis 行列表
          - id: persona
            name: "@deepseek-ai/dsh-persona"
            config: { prefix: You review software changes. }
```

- 当时（`0.2.0-rc.2`）**必填字段只有 `id` 与 `plugins`**；其余可选 —— 这是版本数据，**每次照下面这条重查**。
  核对办法：`Config.listConfigs { name: "@deepseek-ai/dsh-agent-preset" }`，
  看返回的 `schema.anyOf` 里 `required` 数组（✅ 本机查到正是 `["id","plugins"]`）
- 改随附预设：按行 id **覆盖**，`config` 整体替换 → **必须重述全部字段**
- **改动行为要在新会话里验证**（既有会话保留启动时的插件修订版）

---

## 4. 界面之外：Host 半边

### 4.1 不要绕过框架

**稳定性**

- 不拥有决策的 waterfall 监听器**必须 `return next()`**。改写 `agent/pre-step` 决策时要**展开**（`{ ...decision, messages }`），否则 `startsRequestSeries` 之类的字段会丢。
- 必须无视注册顺序成立的拒绝用 `ctx.tools.guard()`（同步）；需要 await 的决策从 `tools/pre-execute` 返回 `ask`。
- 对单个 agent 隐藏工具用**该 agent 上下文上的** `ctx.tools.restrict()` —— 它让 schema 呈现、查找、执行三者一致。
- 观察**最终**结果用 `tools/result`；`tools/post-execute` 只用于**变换结果**。
- per-agent 注册放进 `agent/created` 拿到的 `agent.ctx`，用一个 `agent.ctx.effect()` 包住，**并把这个 disposer 按 agent 记在插件自己的 effect 里**（卸载插件本身不会释放 `agent.ctx` 上的注册）。

**性能**

- 每会话状态用 `ctx.sessionProjections` 单元从日志派生，**不要**订阅 `session/event` 再重扫 `session.events`。`apply(state, event)` 纯同步，对它忽略的事件**返回同一引用** → 未变状态下游零成本。
- 投影状态保持纯 JSON；字段或折叠语义变化时**提升 `stateVersion`**（缓存据此设检查点，冷读只重放尾部）。
- 等在 **durable 事件**上（`turn/end`、`assistant/message`、`tool/result`）；实时 token 从 `agent/assistant-stream` 渲染。**不要**轮询 `agent/status`。
- `whenIdle()` **不代表**某个后续动作完成了 —— 多个输入可以共享同一个运行区间。

### 4.2 软依赖：`ctx.inject`

```js
ctx.inject(['webServer'], (sub) => {
  const webServer = sub.webServer        // 子上下文上的服务，不必再 get
  return sub.effect(() => webServer.register(route), 'my-plugin: route')
})
```

回调签名 `(sub) => disposer`，服务已存在时**同步立即执行**，服务被替换时**重新执行**（旧 effect 自动撤销）。
这条对你有利：**一个注册路径**就同时满足了"现在有"和"以后才有"。

### 4.3 选扩展点：从最弱的开始

| 你想要 | 用 |
|---|---|
| 只移除某些工具 | `ctx.tools.restrict()` |
| 只拒绝某些调用 | `ctx.tools.guard()` |
| 加提示词文本 | `ctx.systemPrompt.section()` |
| 加 per-agent 上下文 | `agent.inject()`（不唤醒） |
| 改写请求/工具执行 | waterfall（`agent/request`、`tools/pre-execute`…） |
| 换整个系统提示装配 | `system-prompt/assemble`（**最强**，要保全别人的贡献） |

### 4.4 🔴 自建 HTTP 路由：鉴权是你的责任

`webServer` 的契约明说：**不提供服务器级 TLS、认证或来源策略**。而**精确路由优先于**
那个为未认证请求返回 401 的 SPA fallback。所以漏掉鉴权的后果不是"权限过大"，
而是**任何网页都能操作你的插件**（威胁面来自 DNS rebinding 与跨站浏览器请求，不只是本机进程）。

**做法**（把 Connection 的信任策略套到你的路由上，**失败关闭**）：

```js
function rejectUnauthenticated(ctx, req) {
  const connection = ctx.get('connection')          // ← 逐请求读，不要 apply 时缓存
  if (connection === undefined || connection === null) return 401       // 失败关闭
  if (typeof connection.requestRejection !== 'function') return 401
  try {
    return connection.requestRejection({ headers: req.headers })        // 401 | 403 | undefined
  } catch {
    return 403
  }
}

// handler 的**第一件事**：
const rejection = rejectUnauthenticated(ctx, req)
if (rejection !== undefined) { sendJson(res, rejection, { error: 'unauthenticated request' }); return }
if (req.method !== 'POST') { sendJson(res, 405, { error: 'method not allowed' }); return }
// 然后才读 body
```

四个要点：

1. **放在 `req.method` 判断和读 body 之前** —— 未认证请求**一个字节都不该被读走**；
2. **逐请求读** `ctx.get('connection')`，这样晚挂载的 Connection 也生效；
3. **失败关闭**：取不到服务时宁可让 Web 组合失去这条 UI 路径；
4. `ConnectionTrustRequest` 就是 `{ headers }`，`req.headers` 直接满足。

**判据（无凭据、无副作用、可反复跑）** ✅ 实测：

| 请求 | 期望 | 证明 |
|---|---|---|
| `POST <你的路由>`（无凭据） | **401 / 403 + 你自己的 JSON** | 拦截在前，且是你的 handler 在答 |
| `POST <不存在的路径>`（无凭据） | 405 或静态层 | 那是 SPA fallback，不是你的 handler |
| `GET /`（无凭据） | 401 | 未认证时 index 也要过 `authorizeIndex` |

> 📖 等价钩子：`connection.admit({ headers })` → `{ peer }` 或 `{ rejection }`。
> 只判断一次拒绝时用 `requestRejection` 就够；需要在这条路由上代表操作者身份做事时才用 `admit`。

**路由只有两种 kind**（✅ 源码 `webServer.register`：`route.kind === "exact"` 进精确表，**其余一切值都进前缀表**，
所以 `kind` 只有"精确"和"前缀"两档；重复注册同一 `kind` + `path` 会抛 `duplicate … route`）。

### 4.5 通知界面：白名单与"能用 ≠ 能加"

- 宿主事件**不是都能**到浏览器：转发清单**硬编码**在 `dsh-api-remotes`（`API_REMOTE_FORWARDED_EVENTS`）。客户端用 `ctx.remote.$on('<name>', …)` 订阅**清单内**事件；**插件加不进自己的自定义事件**。
- ⚠️ 反过来常被误读：**"不能新增 Remote 命名空间" ≠ "不能用 Remote"**。**已存在**的命名空间照常可用（客户端半边可以调它）。只有**插件私有的**写操作才需要自建带鉴权的路由。
- ⚠️ **桌面端用户看不到 `logger`。** "失败要让人知道"的地方，必须把结果并进**返回给调用者的报告**（UI 与工具两条路都能拿到），不能只 `logger.warn`。

### 4.6 查证过的小事

- `ctx.emit('some/event', …)` 是 cordis 内建，不需要额外声明
- `ctx.logger` 不需要 inject
- 读 HTTP body 后要自己兜 JSON 解析错误
- ⚠️ 自己注册的服务**不会**出现在 `Service.listService` 里（它只列有描述的编目服务）—— 看不到 ≠ 没注册

---

### 4.7 🔴 改宿主自有状态：顺序 + 广播 + 部分失败

这一节讲**破坏性操作**（删数据、改归属、动别人的记账）。它最容易出事，而且失败往往是静默的。
四类操作里有三类你都要碰宿主自己的状态：**删掉某条记录**、**把它从某个分组里摘掉**、
**改它挂在谁名下**。

**① 顺序：先让日志落盘、再删、再验证、最后才动记账。**

```
flush（把已提交事件写进持久层）
  → 删文件（每个 id 拼写都要清）
  → 验证真的没了（dispose 竞态可能重建：让出一轮、再扫、还残留就中止）
  → 这时才解记账（分组归属、归档/置顶集合、派生缓存）
```

理由只有一条：**半删的记录比"没删"更糟**。文件没了但记账还在 → 界面出现一个点不开的坏行；
反过来记账摘了但文件还在 → 它掉进"未分组"，用户以为删错了。所以**记账永远最后动**。

> 对应机制：持久层**没有删除 API**（"Nothing deletes session files"），
> 所以这类操作只能自己删文件 + 自己维护派生状态 —— 这也意味着**顺序和广播都是你的责任**。

**② 广播：删掉宿主的自有状态后，界面不会自己知道。**

宿主在**它自己**做这件事时会发一条事件，你做完要**发同一条**：

```
宿主：ctx.on('session/disposed', s => ctx.emit('api-session/removed', s.id))
你  ：ctx.emit('api-session/removed', id)        // ← 删文件不会 dispose，所以必须自己发
```

不发的后果是**教科书级的"文件删净了、界面那行还在"**：客户端列表只在连接重建时重读，
而且重读也会保留未变化的行 —— 被删的行只能靠**显式通知**离开。

**做法**：先去找宿主**自己**在哪发的这条事件（解包搜事件名），照它发。只在**操作确实成功**
之后发（失败路径不发，否则行会凭空消失）。

**③ 优先走公开 API，别直写共享表。**

宿主某些状态有**公开方法**，它顺带维护自己的缓存与时间戳；直写底层表会绕过它：

| 有公开 API | 没有公开 API |
|---|---|
| 用 `ctx.<服务>.<方法>()`（如归档/置顶的 `unarchiveSession` / `unpinSession`） | 只能直写活表（如把 id 从分组成员里摘掉），并且**注释写清为什么** |

**"活表"的含义**：内存里那份权威状态。只改磁盘 JSON 会被下一次周期 flush 覆盖回去 ——
所以**改内存态，不要只删文件**。

**④ 部分失败必须进"返回给调用者的报告"。**

清理步骤常有七八个，任何一个都可能失败。**不要让它们各自 `logger.warn` 就完事**（§4.5：桌面端看不到日志）。
正确形态：收集成一份 `degraded[]`，**和成功结果一起返回**，让 UI 与工具两条路都能看到：

```js
return { ok: true, removed: [...], degraded: [{ step: 'workspace-membership', detail: '…' }] }
// 报告里显式写：INCOMPLETE: 日志已删，但下面这些记账可能还指向它
```

**⑤ 拒绝核销自身**（§5.5）：操作会销毁"调用者自己赖以存在的载体"时，显式拒绝 + 给替代入口。

**两个真实反例（都曾在运行中出现）**

| 现象 | 根因 | 结论 |
|---|---|---|
| 删完 Sidebar 那行还在，重启才消失 | 没广播宿主自己的事件 | 见 ② |
| 补一条"全量重拉列表"后，被删的行渲染成"未分组" | 引入了**第二个写入者** | 见 §11 |

---

## 5. 工具（让模型可以调用）

### 5.1 两种写法

**写法 A —— `defineTool`（需要 import，只适合从安装目录解析的组合包）**

```js
import { defineTool } from '@deepseek-ai/dsh-tools'

ctx.tools.register(defineTool({
  name: 'my_tool',
  description: '一句话说清它做什么。',
  parameters: { path: { type: 'string', required: true, description: '...' } }, // 扁平表
  output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
  async execute(args, exec) { return '...' },
}))
```

`defineTool` 把扁平表编译成 JSON Schema，**并把参数校验包进 `execute`**（违规抛 `ToolArgsError`）。

**写法 B —— 直接注册 `ToolDefinition`（profile 插件推荐，零 import）**

```js
ctx.effect(() => ctx.tools.register({
  name: 'my_tool',
  description: '一句话说清它做什么。',
  parameters: {
    type: 'object',
    additionalProperties: false,                    // 让"模型写的 = 日志里的"
    properties: { path: { type: 'string', description: '...' } },
    required: ['path'],
  },
  output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
  async execute(args, exec) { /* ← 必须自己防御性读 args */ },
}), 'my-plugin: tool')
```

| | 写法 A | 写法 B |
|---|---|---|
| import | `@deepseek-ai/dsh-tools` | 无 |
| `parameters` | 扁平表（`required: true` 写在字段里） | JSON Schema（`required: [...]` 是数组） |
| **参数校验** | ✅ 注册表替你校验 | ❌ **不校验**（见 §5.2） |

**不要混着写**：混用不会报错，但校验的是个四不像。

#### 写法 A 的扁平表 DSL：词汇表

✅ **当时（`0.2.0-rc.2`）**从 `dsh-tools` 的 schema 编译器逐条读出。参数表是"**属性名 → 值 schema**"的映射，
值 schema 按 `type` 分档，**每档允许的键是封闭的**（多写一个键抛
`… is not supported by the value schema DSL`）。

> 升级后要复核：解出该版本的 `dsh-tools`，读 `lib/index.js` 里的编译器
> （搜 `is not supported by the value schema DSL` 与 `ANNOTATION_KEYS`）。
> **编译器的报错文本本身解释了词汇表**，读它比读类型别名准。

```js
parameters: {
  path:   { type: 'string', required: true, description: '...' },  // required 写在字段里
  limit:  { type: 'number', description: '...' },
  mode:   { type: 'string', enum: ['fast', 'safe'] },
  tags:   { type: 'array', items: { type: 'string' } },
  opts:   { type: 'object', additionalProperties: false, properties: { deep: { type: 'boolean' } } },
  either: { oneOf: [{ type: 'string' }, { type: 'number' }] },
}
```

| `type` | 该档额外允许的键 |
|---|---|
| `string` / `number` / `integer` / `boolean` / `null` | `enum`（非空标量数组）、`const` |
| `array` | `items`（一个值 schema） |
| `object` | `properties`、`additionalProperties`（**必须显式写 `true`/`false`**） |
| `json` | 无（编译成"仅注解"的 schema = 任意 JSON） |
| 用 `oneOf` 代替 `type` | `oneOf`（**至少两项**的值 schema 数组） |

**每一档都还允许这四个注解键**：`description` / `title` / `default` / `examples`。

四条硬限制（违反即抛 `JsonSchemaError`）：

1. `type` 与 `oneOf` **不能同时**声明；
2. 用 `oneOf` 时**不能**带 `properties` / `required` / `additionalProperties` / `items` / `enum` / `const`
   （报 `is not supported beside oneOf`）；
3. `required` 只能出现在**属性节点**上，且**只能是 `true`**（写 `required: false` 也会抛）；
4. `type: 'object'` 必须显式写 `additionalProperties`；`enum` 必须是非空标量数组；结构不能循环引用。

> ⚠️ 这套词汇表**只对写法 A 生效**：`defineTool` 会拿它编译并校验参数。
> **写法 B 手写 JSON Schema 时没有任何校验**（§5.2）—— 那些约束变成"你要自己保证的东西"。

### 5.2 🔴 参数校验的真相（✅ 实测 + 源码）

**用写法 B 时，注册表不会按你的 schema 校验参数，错误类型的值会直接进到 `execute`。**

- 源码：`validate = (args) => validateJsonSchemaValue(parameters, args, '')` **只出现在 `defineTool` 内部**；
  主分发路径从不调用它（`validateJsonSchemaValue` 在本包里只有 `defineTool` 的闭包与输出校验两处调用）。
- 实测：某工具声明 `sessionId: { type: 'string' }`，实际传 `{"sessionId": 12345}` ——
  **没有** `INVALID_ARGS`、**没有** `invalid arguments:`，调用照常执行，最后由工具自己的守卫返回
  `delete failed: a session title or id is required`。

**结论（写法 B 的清单）**：

1. `execute` 的开头**自己判断参数形态**：`typeof args?.x === 'string'`、`Array.isArray(...)`、长度上限；
2. 参数**不可用**时 **throw**（或返回明确的失败文本），不要让它继续走进业务逻辑；
3. 想白拿校验就用写法 A —— 但那要求 `@deepseek-ai/dsh-tools` 能被解析（§9.1）。

### 5.3 参数表达力上限

（词汇表的完整清单见 §5.1 末；这里只说**表达不出来**的部分。）

**跨字段约束（"`a` 和 `b` 至少给一个"）表达不出来**：没有 `anyOf` / `allOf`，
而 `oneOf` 与 `properties` 互斥、`parameters` 又必须有 `properties` —— 所以 `oneOf` 只能用在
**单个属性的值**上（如"这个字段是字符串或数字"），不能用来表达"字段之间的关系"。

写法 A 还多一层限制：`oneOf` 分支里**不能**再声明 `type` 之外的结构性关键字（§5.1 硬限制 2）。

**不要硬凑 schema** —— 让它在**运行时**响亮（§5.4），并把约束写进 `description`。
例："至少要给 `sessionId` 或 `title` 之一"就写在描述里，然后在 `execute` 开头判断并给出明确错误。

### 5.4 返回形态是有语义的

📖 文档：模型参数在执行前校验；**无效输入变成普通错误结果**；取消是协作式且等完全停稳，
**主体执行后的取消只能把成功结果替换为 `ABORTED`**。

| 情况 | 应当的形态 | 理由 |
|---|---|---|
| 调用参数不可用（空参、类型不对、无法唯一解析目标） | **throw → 错误结果** | 与 schema 校验失败同类；返回成功形态文本会让模型**以为调用完成了** |
| 执行期异常（存储不可用等） | **throw → 错误结果** | 否则"执行失败"与"调用方式错"在模型侧不可区分 |
| 请求**合法**、但被执行拒绝（策略/安全护栏） | 返回**文本 + 替代入口** | 调用者要的是理由与下一步，不是错误标记 |
| 请求格式正确、执行后失败 | 返回**文本报告** | 文档只把 **schema 级**无效输入定为错误结果 |
| 调用被取消 | **什么都不做** | 框架会把成功结果替换为 `ABORTED`；自己返回"已取消"反而**误报** |

**关键结构**：把"解析阶段"和"执行阶段"放进**两个独立的 try** —— 解析问题是对调用方可见的错误，
执行失败仍返回它自己的报告。（解析调用若在执行的 `try` 之外又没有自己的 try，存储层异常会直接冒出去，
形态上就与"调用方式错"不可区分了。）

**不要把 `exec.signal` 转发进一个不可逆操作**（操作可能**已经提交**，转发取消等于让调用方以为没做成）。
只读、可重入的查询可以转发。

> ✅ **同时演示三类的真实例子**（删除会话工具）：参数空 → `throw`；id 不存在 → **文本报告**；
> 要求删掉**本次调用正在运行的那个会话** → **文本拒绝 + 替代入口**。
> 最后一类最关键：它不是参数错误（id 合法）也不是执行失败（还没执行），
> 用错误结果表达会让模型以为是自己写错了参数而反复重试。

### 5.5 一个操作，多个调用者

规范要求**同一份操作只实现一次**。"一次"指**一份实现**，不是"一个入口"：界面动作、agent 工具、
（需要时）HTTP 路由**都调同一个核心函数**即可。

核心函数**不必**是 Service 类。profile 插件推荐用一个模块级 `async function doThing(ctx, args, opts)` ——
它不需要 import `@deepseek-ai/cordis`（§9.1），而且天然被多个入口复用。

> ⚠️ **不允许核销自身的操作要显式拒绝。** 若操作会销毁调用者自己赖以存在的载体
> （例如删除"本次工具调用正在运行的那个会话"），核心实现里要有一条显式拒绝，并把**替代入口**告诉调用者。
> 这不是风格问题：工具结果必须写进那个日志，而日志正在被删 —— 让它在运行时响亮，
> 胜过一个看起来成功、实则数据不一致的结果。
> 取"当前调用者"的办法：`ctx.get('agents')?.currentInitiator()`（✅ 本机服务签名）。

---

## 6. 清单、patch、安装、换代、卸载

### 6.1 清单字段的坑

| 字段 | 说明 / 坑 |
|---|---|
| `name` | **目录名可以随便，包名才是身份。** 改包名 = 换一个包（§6.5） |
| `version` | 与已安装的同名包同版本，会让两份无法区分 |
| `type` | 必须 `"module"` |
| `main` | 即使不在 `files` 里也要写（`files` 只影响打包发布） |
| `exports` | Host `"."`；Client `"./client"`；元数据 `"./package.json"`；文案 `"./locale/*.json"` |
| `icon` | 相对 manifest 目录；SVG/PNG/JPEG/WebP，≤256 KiB；拒绝绝对路径、URL、目录外路径、逃逸符号链接 |
| `meta` | `package.json` 顶层：清单内联的展示文本，**扁平**（`{ "title": …, "description": … }`） |
| `locale/<lang>.json` | 按语言的展示文本，**嵌套**（`{ "meta": { "title": …, "description": … } }`）。⚠️ **扁平形状会被静默忽略** → 形状快照见 [`版本快照/0.2.0-rc.2/展示元信息-形状.md`](版本快照/0.2.0-rc.2/展示元信息-形状.md) |
| `dsh.bundle.patch` | patch 路径；也接受有序列表，**同一层按序应用**，各文件里的相对插件路径**相对于该文件自身**解析 |
| `dsh.client.platform` | **必填**，且必须是字符串（✅ 源码 `parseDshClient`：非字符串直接抛），当前只有 `"web"` |
| `dsh.client.immediately` | 可选**布尔**（给别的值会抛；默认不立即） |
| `dsh.client.inject` / `external` | 可选**字符串数组**（成员非字符串会抛）。只用于激活排序 / 用平台种子表外的模块 |
| `peerDependencies` | **可选**（§9.3）：声明了就只有"版本兼容门"作用，写错范围会把整包拦下 |

> 📖 展示元数据（`icon` + `meta` / `locale/*.json`）是**不激活插件**就能读到的；
> 缺失字段回落 `name` / `description` 与面板默认图。它与**运行时文案**（Client locale，§7.4）是两回事。

### 6.2 Loader patch 方言

patch 是**顶层 YAML 数组**：

```yaml
- insert:                      # 追加行
    - id: my-plugin
      name: "@local/my-plugin"
      config: { ... }          # 可选
- id: some-existing-row        # 覆盖：提供的字段替换该行字段
  config: { ... }              # ⚠️ config 整体替换，不是深合并 → 必须重述每个键
```

| 写法 | 语义 |
|---|---|
| `- insert: [rows]` | 追加；`insert` 带 `id` 且指向 `group: true` 的既有行时，插进该 group 的 `config` 列表 |
| `- id: <既有行>` + 其他字段 | 覆盖该行 |
| `id` 为真值 + `name` | **断言**既有插件名，而不是改名 |
| 没有 `insert` 且 `id` 空 / 匹配不到 | 警告并跳过 |

行字段：`id`、`name`、可选 `config`，以及 `disabled`、`inject`、`intercept`、`isolate`。

- **group**：`group: true` + `name: cordis:group` 使 `config` 成为嵌套行列表；`cordis:include` 从 `config.path` 读行列表。
- **disabled**：布尔、`null` 或 `!!js` 表达式（**每次挂载决策**时求值）。
- **`!!js`**：写 `!!js` **不写** `!js`；在 `config` 里于该行声明的注入激活**之后**针对该插件上下文求值（可用 `ctx.<service>`）；其他行元数据保持字面值。
- **isolate**：服务名 → `true` / realm 标签。**提供 Service 的预设插件必须把提供方与全部消费方隔离在同一 realm。**

**组合层序（后层胜）**：profile 的 `dsh.profile.bundles` 列表 → profile 自己的 `cordis.patch.yml`
→ `$DSH_HOME/cordis.patch.yml` → 每个 `--patch` overlay。

**两条推论**：你的 patch 可按 id 覆盖前面的行，但**必须重述全部键**；
**用户始终能在自己 profile 的 patch 里覆盖你的行** → 给用户大概率保留的默认值。

> ⚠️ **删插件时顺手删掉指向它的覆盖项**：patch 里留着 `- id: <已删插件的行>` 会变成"匹配不到行"的警告。

### 6.3 模块代：为什么"改了没生效"

**同一进程内，一个模块只会被求值一次**（Node 的 ESM 缓存以解析后的 URL 为键）。

| 你做了什么 | 何时生效 |
|---|---|
| 新装一个 bundle | 可能经热加载**立即**生效 |
| **替换**已安装包的代码 | **不会**自动换世代 |
| **切换插件开关**（`set_bundle`） | **不会**重载模块（但会撤销该 fiber 的注册） |
| 原地改文件后重装 | 通常**不会**换世代 |
| ✅ **把源码目录加进 `hmr` 的 `config.root`** | 改文件即触发热重载，**不重启** |
| ⚠️ 换路径（改目录名）再装 | 能换世代，但**旧世代不被卸载** —— 不要用 |

**正道：让 HMR 监视你的源码目录**（profile 的 `cordis.patch.yml`）：

```yaml
- id: hmr
  config:
    root:
      - F:/path/to/my-plugin/src     # 只监视源码目录，不要把整个盘加进去
```

✅ 实测：首次安装失败的包，在 `hmr.root` 生效后**改一次文件就激活成功**，全程未重启。

> ⚠️ **为什么不要用"换路径"**：旧 fiber 不会被卸载 → 旧世代注册的 **HTTP 路由继续响应**
> （所以"路由还能响应"不能证明新代码已加载）；若新世代注册**同一路径**，webserver 会抛
> `duplicate exact route`，于是你得到**新旧混杂**的运行时。真要换代又没有 HMR：**老老实实重启**。

**加了 `hmr.root` 之后，两半都会跟着重载** —— 不是只有 Host 半边：

| 半边 | 谁在看着 | 重载路径 |
|---|---|---|
| **Host** | HMR 的文件监视 | 清 ESM/CJS 模块缓存 → 重新 import → 旧 fiber 卸载、新世代挂载 |
| **Client** | 同一份文件监视 | 客户端模块登记处发现文件 mtime/ctime/size 变了就判定新修订版，经 `ctx.clientModules.onRebuilt` 推出 SSE `{"type":"rebuilt", id, rev}`；浏览器里的模块控制器据此换掉那一版并重渲染 |

所以**改 `client.js` 也常常不必手动刷新**。

> ⚠️ **"改动没体现"时先刷新页面 —— 这一步的作用是排除时序，不是换代码。**
> 帧可能已经渲染完而你的改动落在下一帧；SSE 帧送达与浏览器换版之间也可能差一拍。
> 于是判据分两种：
>
> - **刷新后行为变了** → 新代码**本来就已生效**，你只是观察晚了（时序问题）；
> - **刷新后仍是旧行为** → 这一版**根本没换**：没配 `hmr.root`、改的文件不在监视范围内、
>   或是 Host 半边加载失败（回 §9.2 看诊断）。
>
> **排查顺序：先刷新排除时序，再查世代。**

### 6.4 更新 / 卸载 / 重装（✅ 完整实测）

| 意图 | 做法 | 坑 |
|---|---|---|
| 改代码生效 | `hmr.root` 或重启 profile | 原地重装不换世代 |
| **换版本 / 换目录** | **先 `remove_bundle`，再 `install_bundle`** | 已装状态下直接再 `install_bundle` → `ambiguous-install` |
| 临时停用 | `set_bundle { enabled: false }` | 停用不卸载模块，但撤销注册 |

> ⚠️ **`ambiguous-install` 是什么**：安装器用"`package.json` 依赖前后差异"反推刚装的是哪个包；
> 目标已装、依赖没变化时差异为空，回退的按名匹配又对 `file:` 路径无效 → 报它。
> **这不是失败，是"没有变化可提交"。**

**卸载** ✅ 实测：`remove_bundle` 返回 `application: "applied"`、无 warning；
profile `package.json` 的 `dsh.profile.bundles` 与 `dependencies` 都被移除，
`pnpm-lock.yaml` 与 `node_modules/.modules.yaml` 一并清干净；
此后 `Config.listConfigs { name }` 返回**空目录**（= 行确实离开了 Loader 树）。

> ⚠️ Windows 上 `node_modules/<scope>/<name>` 的 **junction 可能残留**（pnpm 的清理行为）：
> 不影响重装（清单与锁文件已一致），属纯垃圾目录，想彻底干净可手动删。

**重装**用**同一条** `install_bundle` 命令即可 ✅（row id 不变，槽位与工具都回来）。

> ⚠️ **权限**：每个 `plugin_manager` 操作（**含 `list_plugins` / `list_bundles`**）都要求
> `danger-full-access` 或本次调用的批准；`never`、被拒绝、被取消或审批渠道不可用**都不执行**。
> 批准**不会改变**会话的权限模式。**已安装的 Host 代码在宿主进程内运行，不受工作区沙箱限制。**

### 6.5 改名的代价

**改包名 = 换一个包。** 三处必须同步：`package.json` 的 `name`、`client.js` 的
`__ModuleLoader__.load({ id })`（**必须等于包名**）、profile 的 `dependencies` 与 `dsh.profile.bundles`。

### 6.6 CLI 安装的路径分词陷阱

`dsh plugin --profile <p> add …` **把参数原样转发给 pnpm**；路径含空格时未加引号的 `file:` 会被切开
（`ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER`）。**对策**：整个参数加引号，**或直接用 `plugin_manager`**
（target 走 JSON 字符串，不经 shell 分词）。含中文/空格的路径尤其应该走 `plugin_manager`。

### 6.7 构建脚本授权（pnpm ≥10）

包有安装脚本（`prepare` / `postinstall`）时 pnpm 会拦下并要求显式批准；安装失败的返回里会有
`pendingBuilds`。Web 插件页提供"允许并重试"；`install_bundle` 的 `approvedBuilds`
**只能在该用户明确批准这些脚本之后**传入（服务只校验名字，**不核实对话历史**）。

> ⚠️ 请把该授权视为"**允许该包代码在安装时以宿主用户权限、在任何沙箱之外执行**"。
> 只对来源可信的包授权，并锁定 commit（`github:you/pkg#<sha>`）。

---

## 7. Client（UI）半边

### 7.1 模块格式

```js
window.__ModuleLoader__.load({
  id: "@local/my-plugin",   // ← 必须 === package.json 的 name
  factory(require) {
    const React = require("react")
    // ...
    return { inject: ["slots", "locale"], apply }
  },
})
```

- factory **不要有副作用**；样式、定时器、监听器都在 `apply` 里用 `ctx.effect` / `ctx.on` 注册并返回清理。
- 组件是**模块级** React 组件，用 `React.createElement`（没有 JSX 转换）。
- 表外模块用 `dsh.client.external` 声明。

### 7.2 平台种子表与三个 lane

**先讲规则，再讲怎么查值。**

浏览器里的 `require` 只解析到一张**平台种子表**（shell 在启动时冻结的模块表）。落笔前你要查两件事：
你的 Client 半边属于哪个 lane、以及该 lane 在这个版本里能拿到哪些模块。

| lane | 谁 | 能 require 什么 |
|---|---|---|
| **动态模块包**（本指南教的：`__ModuleLoader__.load` + `dsh.client`） | 你手写的 `client.js` | 平台种子表里的模块（✅ 本版本含 `ui-primitives` —— 它是本 lane 的**隐式 external**，不必写进 `dsh.client.external`） |
| **编译发布的 Client 包**（DSH 自带的 `.tsx` 包） | 源码 checkout 里的包 | ❌ 不 require Harness Client 包：**自己复制控件标记与 CSS**，只用 `--dsw-alias-*` |
| **`cordis-client-runner` 闭包** | agent 动态写的 UI | ❌ 什么都不 import：只用注入的 `ctx` / `React` / `styles` / `host`（`Builtin.listBuiltins` 能列全） |

> 📖 出处：随包的 `ui-workspace` 文档明写动态 Module Loader 包**把 `ui-primitives` 当隐式基线 external**
> （"A Module Loader package (`factory(require)`…) gets `@deepseek-ai/dsh-client-ui-primitives`
> as an implicit baseline external"），它自己的动态行就在 require `MenuItemButton` 等。

#### 怎么查这张表（不要抄，会过期）

**本文不列这张表的成员名单**，因为它随版本变动，写死只会误导。用 §9.5 的探针解出前端产物后：

```sh
# 种子表就在前端主 bundle 里，是一个 id → 模块 的对象字面量
grep -o 'react-dom/client[^}]*}' <解出来的 dist>/assets/index-*.js | head -c 1200
```

当时（`0.2.0-rc.2`）读到的成员 → [`版本快照/0.2.0-rc.2/种子表.md`](版本快照/0.2.0-rc.2/种子表.md)。
**以你自己读到的为准**，特别是新增的 `dsh-client-*` 成员。

> 另一个等价判据：`Builtin.listBuiltins` 列的是 **runner 闭包**能拿到的注入
> （`ctx` / `React` / `host` / `styles` / `console`）—— 那是第三个 lane 的口径，不要混用。

**两条不随版本变的规则：**

- **解构前务必核对导出确实存在。** ✅ 真实案例：某实现从 `ui-primitives` 解构 `IconTrashOutline16`，
  该版本只导出 `IconTrashOutline` / `…Regular` / `…Medium` / `…Artwork` —— 命中 0 次 →
  `require` 成功但返回 `undefined` → `React.createElement(undefined, …)` 抛错 → **整个槽位白屏**。
  规则的本质是"**核对导出存在**"，不是"禁止 require"。
- **不要自己 portal 到 `document.body`。** `react-dom` 确实在表里、机制上可行，但宿主自己的 Modal
  已经渲染在那个模态层里；你再 portal 会绕开宿主的 Escape / 焦点归还 / 层级。**要浮层就用 `shell.overlay` 槽位。**

### 7.3 其它硬性要求

- 只用 `Theme.listTokens` 列出的 **`--dsw-alias-*`**（另有 `--dsw-specific-*`）令牌；**字面颜色仅用于插画**。
- 间距、字号、行模式抄同类宿主页面；**管理列表的参照物是 Plugin Manager 页面**。
- **不要**替换 app root、**不要**向 `document.body` 追加第二个应用、**不要**在组件外写 DOM。
- **不要**读别的插件的 DOM / 样式表 / 组件源码来估算位置 —— 选一个**已经分配好空间**的槽位。
- **不要**用 iframe 承载 Host 提供的页面（iframe 拿不到主题令牌、明暗切换与 `ctx.locale`）。
- Client **不要**自己折叠会话事件；需要会话派生值就在 Host 投影上声明，算好再送过来。

### 7.4 文案：`locale: NS` 只是指路，而且座位不能无条件信

槽位注册行上的 `locale: NS` **只注入 `t` seat，不安装字典**。必须自己注册：

```js
ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'my-plugin: dictionaries')
```

**不注册的症状**：界面显示**裸键名**（`menu.delete`、`dialog.title`…）—— `t` 存在但查不到，于是回退成 key。

**但"注册了就不会有裸键"是错的。** 两个必须知道的机制：

1. **`translate(ns, key)` 找不到时的兜底是 `?? key`** —— 命名空间**还没有字典**时，
   它**原样返回 key 本身**，不抛错、也不返回空串。所以"拿到 `t`"与"有文案"是两件事。
2. **渲染可能早于注册。** 字典注册写在 `ctx.effect` 里，而组件可能先被渲染；
   若你把注册挂在 `ctx.get('locale')` 的分支上（服务此刻还没 active → 不注册），
   窗口期会更长。**症状有极强的迷惑性：启动后第一次打开是裸键，重载一次插件就好了。**

**做法（三条一起用）：**

```js
// ① 座位只在真的翻译出内容时才生效；否则回落内置字典
function resolveText(seat, key, values) {
  if (typeof seat === 'function') {
    try {
      const text = seat(key, values)
      if (typeof text === 'string' && text !== '' && text !== key) return text   // ← 关键判断
    } catch { /* 座位坏了也不能让文案变空 */ }
  }
  return builtinText(key, values)          // 内置 zh/en 字典（也就是没有 locale 服务时的兜底）
}

// ② locale: NS 无条件声明 —— 组件自己有兜底，所以座位有没有都安全
ctx.slots.register({ name: SLOT, id: 'myRow', locale: NS }, MyComponent)

// ③ 服务用 ctx.inject 等（§8.1）；字典落地后让已渲染的组件重取一次文案
ctx.inject(['locale'], (sub) => {
  ctx.effect(() => {
    const disposer = sub.locale.register(NS, { zh, en })
    touchSubscribers()                     // 例：把模块级状态重发一次，订阅者于是重新渲染
    return disposer
  }, 'my-plugin: dictionaries')
})
```

- `inject` 里声明 `locale`（**硬依赖**最省事：`return { inject: ['slots', 'locale'], apply }`）——
  这样 `ctx.locale` 必然可用，① ③ 两步仍然要有，因为它们防的是**注册完成前的那段窗口**。
- 想让插件在没有 locale 服务的组合里也能加载，就把它当**软依赖**（只 `ctx.inject`）；
  **但不要**写成"`ctx.get` 快路径 + `ctx.inject` 兜底"两条分支（§1：effect 会挂在不同 ctx 上）。
- 内置字典不是"绕过 locale 服务"：它是官方文档写明的 fallback，现在同时覆盖**注册窗口期**。
- 排障判据：`grep 'translate(ns, key' <版本的前端 bundle>` 看到 `?? key` 就说明这条机制仍在。

### 7.5 槽位注册

```js
ctx.slots.inject(SLOT, function* () {
  yield ctx.slots.register({ name: SLOT, id: 'myRow', order: 500, locale: NS }, MyComponent)
})
```

- `ctx.slots.inject(key, cb)`**必须用**：它等声明出现、声明消失时摘掉你的条目、恢复时重新注册。
  回调可返回一个 disposer 或可迭代的多个（生成器即可）。
- 注册对象需要 **`id`**（必须）；`order` / `label` 可选。**不要**猜 `key` / `priority`。
- **组件能拿到的 props 由槽位自己的标准 props + `ownerProps` + `hookContext` 决定，必须查、不能推**：

```
Slots.listSubTree { root: "<槽位名>" }
```

看 `catalog.standardProps`（框架统一注入的，如 `useSessions` / `sessionId`）、
`catalog.ownerProps`（owner 传什么）、`catalog.hookContext`（注入什么 hook）、
`catalog.slotInject`（owner 侧已声明的 hook 源）。

**ownerProps 的形态**：`Slots` 返回的类型声明里，owner props 是**接口源码字符串**。
它是版本数据 —— 快照在 [`版本快照/0.2.0-rc.2/槽位-ownerProps.md`](版本快照/0.2.0-rc.2/槽位-ownerProps.md)，
**照抄你自己查到的那段声明里的字段名**，不要自己起名，也不要照抄快照里的那份。

**三种把值送进组件的方式：**

| 方式 | 写法 | 组件里 |
|---|---|---|
| 标准 props | 什么都不用做，框架注入 | `props.sessionId`、`props.useSessions(selector)` |
| 自己的 observable hook | `inject: () => ({ hooks: { myState } })`，`myState` 须有 `getSnapshot` + `subscribe` | `props.useMyState(selector)` |
| owner 的 hook factory | `inject: (standard, hookContext) => ({ hooks: { menuOpenState: () => hookContext } })` | `props.useMenuOpenState()` |

> ⚠️ **槽位里"注册成功"≠"用户看得见"**：注册进一个**当前 composition 里不存在**的槽位不会有任何提示
> —— 用 `listSubTree` 的 `occupants` 确认，再刷新页面看效果。

---

## 8. Host 半边：服务、投影、事件

本节是 §4.1 的展开，按"你打算做什么"组织。

### 8.1 取服务的三条路

| 场景 | 用 |
|---|---|
| 硬依赖（缺了就不该启动） | `export const inject = ['tools']` → `ctx.tools` |
| 软依赖（有就做） | `ctx.inject(['webServer'], (sub) => ...)` |
| **每次请求/调用重新解析** | `ctx.get(name)`（因为要容忍晚挂载的服务） |

`Service.listService { service }` 返回的 `access.optional` / `access.hardDependency` 就是每个服务的官方指引。

### 8.2 投影：派生会话状态的正规做法

```js
ctx.sessionProjections.register({
  key: 'myState',
  stateSchema,                        // 纯 JSON
  init: () => ({ ... }),
  apply: (state, event) => (忽略的事件返回 state 本身),
  wire: { viewSchema, view: (state) => ... },   // 需要送到 Client 时声明
  stateVersion: 1,                    // 字段或折叠语义变化时 +1
})
```

- `apply` 必须**纯同步**，且对它忽略的事件**返回同一引用**（否则下游每次都被唤醒，缓存每次失效）。
- 需要 Client 用这个值：声明 `wire.view`，值在 Host 算好再送（Client **不要**自己折叠事件）。
- 投影缓存会据此设检查点：冷读只重放尾部，`stateVersion` 变化时陈旧检查点被丢弃。

### 8.3 事件与日志的边界

- **不要**用新的 `type` 追加会话事件：读取方只接受信封携带 `ignorable: true` 的未知存储事件，
  而实时 `Session.append()` **无法设置该标记**，会话会拒绝重新打开。
  从既有事件派生状态，或把插件自有数据放进 inspection 找到的 storage 服务。
- 观察最终结果用 `tools/result`；改写结果只在 `tools/post-execute`。
- 不拥有决策的 waterfall **必须 `return next()`**。

### 8.4 定时与唤醒

- 起工作的定时器 → `agent.followup()`（**唤醒**）；只补上下文 → `agent.inject()`（**不唤醒**，可能一直等）。
- 定时器在拥有它的 effect 里清掉。
- 不要轮询 `agent/status`；等 durable 事件。

---

## 9. 版本、解析路径、配置形状

### 9.1 能不能 import `@deepseek-ai/*`（结论 + 机制）

**推荐写法：插件零 `@deepseek-ai/*` import，只用 `node:` 内建，一切服务从 `ctx` 拿。**
但理由**不是"import 必然失败"** —— 是**解析路径**：

| 你的包怎么装进去 | 裸名从哪里解析 | 能否 import |
|---|---|---|
| `plugin_manager install_bundle`（`file:` / 本地目录，= profile 的 `node_modules/<name>` 指向你的目录） | 从**你目录的真实路径**向上找 `node_modules` —— 那里只有 profile 自己装的包 | ❌ `ERR_MODULE_NOT_FOUND` |
| 同上，但你把该包**声明成依赖**并让 pnpm 装进 profile | profile 的 `node_modules` 里有它 | ✅ |
| dsh 自带的组合包（从安装目录解析） | 从安装目录出发 | ✅ |

> **机制**：`install_bundle` 用 `link:` 把包挂进 profile 的 `node_modules`。Node 解析裸包名时
> **先解析符号链接的真实路径**，再从**真实路径的祖先目录**找 `node_modules` —— 两者对不上就失败。
> 也就是说：**"能不能 import"取决于包在不在解析路径上，与它是不是 `@deepseek-ai/*` 无关。**

✅ 实测对照（同一个包，逐字不动，只改一处）：

| 形态 | 结果 |
|---|---|
| 零 `@deepseek-ai/*` import | ✅ `application: "applied"`、`warnings: []` |
| 只把 `import { defineTool } from '@deepseek-ai/dsh-tools'` **去掉** | ✅ 立刻激活成功 |
| 保留一个**手写的 `Config` 导出**（合法 Standard Schema，但不是原生 schemastery） | ❌ 激活失败：`TypeError: Cannot read properties of undefined (reading 'validate')` |
| 卸载后重新 `install_bundle` | ✅ `application: "applied"`、`warnings: []` |

**零 import 的三个替代**：

| 不用 | 改用 |
|---|---|
| `import { Service } from '@deepseek-ai/cordis'` | 需要对外提供服务时用 `ctx.provide(...)`，或把方法挂到你在 `apply` 里注册的对象上 |
| `import { defineTool } from '@deepseek-ai/dsh-tools'` | 直接注册 `ToolDefinition`，参数写协议级 JSON Schema（§5.1 写法 B，**记得自己校验参数**） |
| `import Schema from '@deepseek-ai/schemastery'` | **不导出 `Config`**（§9.4） |

> ⚠️ **不要**为了"以后可能用到"先写 import；真需要某个包时，先把它装成 profile 依赖。
> ⚠️ **不要**照抄网上"在 `%DSH_HOME%\profiles\node_modules` 里找软链接"的排障法：
> 该目录在本版本**不存在**（✅ 实测），相关兜底函数已从代码中移除。这套解析完全是**进程内**的。

### 9.2 诊断入口

**四件套，按顺序：**

1. **安装返回的 `application` / `warnings`** —— 唯一能判定"这次生效了吗"的地方。
   | `application` | 含义 |
   |---|---|
   | `applied` | 已生效（可能经热加载） |
   | `failed` | 需诊断 |
   | `overridden` | 更高优先级的层获胜 |
   | `restart-required` | **未生效** |
2. **安装返回的 `diagnostic`**（带 stack）—— 最可归因的错误入口。
3. **`Config.listConfigs { name }` 的 `status`**（§9.4 的表）—— 区分"模块加载"与"激活"。
4. **`Slots.listSubTree` 的 `occupants`** —— UI 注册是否真的进了树。

> **原样输出**（本版本那些文案长什么样、`status` 的完整取值表）→
> [`版本快照/0.2.0-rc.2/诊断文案.md`](版本快照/0.2.0-rc.2/诊断文案.md)。
> 文案会变，**判据不会**：下面这张表才是要记的东西。
**`failed to import` 是兜底文案，不含原因**（📖 源码：`entry.fiber === undefined` 就报它，硬编码；
真错误在 `cordis-plugin-loader` 的 catch 里 `logger.error(error)` 后被丢弃）：

| 你的插件 | 诊断长什么样 |
|---|---|
| 模块**解析**失败（`_init` 就抛） | `failed to import`，**无 stack** |
| 模块加载成功、但 `apply()` 或 `Config` 校验里抛错 | **带完整 stack 的真实错误** |

> ⚠️ **桌面端看不到 `logger` 输出**（✅ 本机 `%APPDATA%\@deepseek-ai\dsh-desktop\logs` 存在但 **0 个文件**），
> 所以第 2 条（返回里的 `diagnostic`）比翻日志可靠得多。
> "失败要让人知道"的地方，必须把结果并进**返回给调用者的报告**（§4.5）。
> 见到 `failed to import` 且你是零 import 写法时，先怀疑**顶层代码**与**`Config` 形状**，不是 import。

### 9.3 版本兼容门（只在声明 peer 时才生效）

- profile 导入插件前，检查 `peerDependencies` 里对 `@deepseek-ai/dsh` 与 `@deepseek-ai/dsh-*` 的声明：
  每个声明的范围都必须匹配（**预发布版本参与匹配**）；`workspace:*` 指向同一运行时；
  **未声明 DSH peer 则不施加任何约束**（= 零升级告警）；依据是 **peer 声明**，不是 `engines.dsh`。
- 被拒绝的插件**永不导入其模块**：普通行变成游离的 `disabled: true` 行，组合包进 `skippedBundles`。

**取舍：**

| 选择 | 得到 | 失去 |
|---|---|---|
| **不声明**（推荐，尤其零 import 时） | 永不被兼容门拦下 | 没有升级告警 |
| **声明且钉精确版本** | 唯一可靠的升级告警来源 | 写错范围 → **整包被跳过** |

**抄别人的清单前一定重核版本范围。** 一个为**上一个预发布代**写的范围（`^0.x.0-rc.N` 这类）
在当前代上**不匹配** → 整个 bundle 被跳过。快照里如果留着当时的范围写法，只当形状参考，
**范围本身每次都要按当前运行时重写**。

若确实要装 peer 不兼容的插件，按**精确版本对**授权；豁免写在 profile 自己的 `compatibility.json`，
**插件升级与 DSH 升级都不继承授权**，且 `acceptRisk: true` 只能在明确告知风险并取得许可后传。

### 9.4 `Config`：形状要求与"宁可不写"

```js
import Schema from '@deepseek-ai/schemastery'   // ← 需要这个 import
export const Config = Schema.object({ keepAttachments: Schema.boolean().default(false).description('...') })
```

- 声明了 `Config` → Loader 在激活时**校验**该行 `config`，`Config.listConfigs` 会发布 JSON Schema。
- ⚠️ **`Config` 必须是原生 schemastery 对象**：Loader 调 `Config['~standard'].validate`，
  而 Harness 的检查面要求 `Config[Symbol.for('schemastery')] === true` 且带 `type` / `meta`。
  **手写一个"看起来像 Standard Schema"的普通对象会让整行激活失败**（✅ 实测 `TypeError: … reading 'validate'`），
  或至少让 `status` 变成 `unsupported`。
- **不导出 `Config` 完全合法**，且**推荐**：原始的行 `config` 会原样传给 `apply`。
  你拿不到 schemastery（§9.1），就别造半个 schema —— 把可调值放进行 `config`，在 `apply` 里**防御性读取**：

```js
function sessionsRootOf(config) {
  const v = typeof config?.sessionsRoot === 'string' ? config.sessionsRoot.trim() : ''
  return v || defaultRoot()
}
```

**`status` 取值**（当时（`0.2.0-rc.2`）读源码 `dsh-tool-cordis` 得到；新版本可能新增取值，
遇到不认识的 status 就按"模块已加载但另有问题"处理，并去读该版本的 `liveConfig()`）：

| `status` | 含义 |
|---|---|
| `schema` | 模块已导入，且读到了**原生** `Config` |
| `inactive` | 行存在但未激活 |
| `absent` | **没有** `Config` 导出（正常形态） |
| `unsupported` | **有** `Config` 但形状不对 → 设置页渲染不出表单 |
| `tree` | 该行是 group / 子树，不是插件 |

> `Config.listConfigs { entry }` 还能读到该行的 **`packageDir`**（参考实现的源码目录）与
> `acceptsMissing` / `limitations`。

### 9.5 解出运行时的包与版本（asar 探针）

运行时表就是 `app.asar` 内 `dsh/package.json` 的依赖键。**脚本在快照夹里**：
[`版本快照/0.2.0-rc.2/_tools/asar-extract.js`](版本快照/0.2.0-rc.2/_tools/asar-extract.js)
（工作流 §3.1 有同一份，说明也写在那里）。

```sh
node 版本快照/0.2.0-rc.2/_tools/asar-extract.js "<安装目录>/resources/app.asar" \
     "/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace" "_ref/ui-workspace"
```

三条不随版本变的纪律：

1. **asar 的头布局不是 DSH 的契约** —— 它由 Electron 决定，DSH 换 Electron 就可能变。
   脚本自带三条自检（§工作流 §3.1）；**读不出来就换 `@electron/asar` 之类的现成解析器**，别硬套偏移。
2. **归档内的内容可能是 CJS 包装**（入口字节像 `};{`），直接对整块 `JSON.parse` 会失败 ——
   往前退几字节做花括号配对，或只取第一个完整对象。
3. **asar 内没有 `.d.ts`**：类型信息只在已编译 `lib/*.js` 的 JSDoc 里，或去读源码仓库。

---

## 10. 排障索引

> 表里的**诊断文案**是基准版本的原样输出（换版本可能改字），但**每一行的"原因"是机制**，
> 不随文案变。先按"原因"排查，文案只是入口。
> 那些原样文案与 `status` 取值表在快照里：[`版本快照/0.2.0-rc.2/诊断文案.md`](版本快照/0.2.0-rc.2/诊断文案.md)。

### A. 插件根本没起来

| 你看到 | 最可能的原因 | 去哪 |
|---|---|---|
| `application: "failed"` + `did not activate … failed to import` | 兜底文案，不含原因。零 import 时先查**`Config` 形状**与**顶层代码** | §9.2、§9.4 |
| 诊断里**带 stack**（`TypeError: … at …`） | 模块导入成功了，是 `apply()` / `Config` 校验里抛的 —— 顺 stack 查 | §9.2 |
| 行变成游离的 `disabled: true` | **peer 范围不匹配** → 兼容门拦下 | §9.3 |
| 整包被跳过（`skippedBundles`） | 组合包自己声明的 DSH peer 不兼容 | §9.3 |
| 行存在但 `fiberPhase` 不是 `active` | `inject` 里的服务不存在 → 软依赖改用 `ctx.inject` | §1、§8.1 |
| `status: "unsupported"` | `Config` 形状不是原生 schemastery | §9.4 |
| `status: "inactive"` | 行未激活（可能被更高层 patch 覆盖） | §9.2 |
| 返回 `pendingBuilds` | pnpm 拦下了安装脚本，需用户明确批准 | §6.7 |

### B. 改了代码但"没生效"

| 你看到 | 原因 | 去哪 |
|---|---|---|
| 磁盘是新代码、行为是旧的 | ESM 按 URL 缓存 | §6.3 |
| 开关插件后行为不变 | toggle 不重载模块 | §6.3 |
| 想不重启就换世代 | ✅ `hmr.root` | §6.3 |
| 用"换路径"后行为诡异 | 旧世代没卸载 → 旧路由存活 / 重复路由报错 | §6.3 |
| Client 侧没反应 | 先刷新排除时序；仍是旧行为才是没换世代 | §6.3 |
| 不确定跑的是哪一代 | 文件 mtime **vs** 进程启动时间 | §6.3 |

### C. UI 白屏 / 显示错

| 你看到 | 原因 | 去哪 |
|---|---|---|
| 控制台 `slot entry crashed in '<slot>'` | 组件抛错；最常见是**解构到不存在的导出** | §7.2 |
| 整个槽位空白 | 同上（一个抛错的分支白屏**整个**条目） | §7.2 |
| 组件完全没渲染 | 注册进了当前 composition **不存在**的槽位 | §7.5 |
| 显示**裸键名** | 声明了 `locale: NS` 但没 `ctx.locale.register` | §7.4 |
| **注册了字典仍显示裸键名**（重启/重载一次就好） | `t` 座位来自**还没装字典**的命名空间（`translate` 兜底 `?? key`）→ 座位不能无条件信 | §7.4 |
| 拿不到期望的 props | props 由标准 props / `ownerProps` / `hookContext` 决定，**必须查** | §7.5 |
| 主题不跟随明暗 | 用了字面颜色 | §7.3 |
| iframe 里样式失效 | 不要用 iframe | §7.3 |
| 管理页显示的是**英文/包名**，不是 `locale/zh.json` 里的中文 | locale 文件用了**扁平**形状（`{title,…}`）→ 读取器只看 `parsed.meta`，整份被静默忽略 | §6.1、快照 [`展示元信息-形状.md`](版本快照/0.2.0-rc.2/展示元信息-形状.md) |

### D. 服务取不到

| 你看到 | 原因 | 去哪 |
|---|---|---|
| `ctx.get('某服务')` 返回 `undefined` | 异步激活的服务，`ctx.get` 是 strict 的 | §8.1 |
| `cannot get property X without inject` | 该服务不在 `inject` 里 | §1 |
| 自己注册的服务在 `listService` 里查不到 | 自带服务不进编目 —— 看不到 ≠ 没注册 | §4.6 |
| 两条注册路径行为不一致 | `ctx.get` 与 `ctx.inject` 把 effect 挂在不同 ctx | §1 |

### E. 路由 / 安全

| 你看到 | 原因 | 去哪 |
|---|---|---|
| 无凭据请求**进了业务逻辑** | 精确路由优先于 401 fallback，webserver 不做鉴权 | §4.4 |
| 加了检查仍被绕过 | 放在了 method / body 判断**之后** | §4.4 |
| 想确认鉴权生效 | 无凭据 POST 期望 401/403，并用不存在的路径做对照 | §4.4 |

### F. 工具行为不对

| 你看到 | 原因 | 去哪 |
|---|---|---|
| 模型以为成功、其实没做事 | 失败被返回成了**成功形态文本** | §5.4 |
| "执行失败"与"参数写错"分不清 | 解析阶段没有独立的 try | §5.4 |
| **错误类型的参数进了工具体** | 写法 B **不做参数校验**（注册表只在 `defineTool` 里校验） | §5.2 |
| 已完成的操作被报成"已取消" | 手写了 `signal.aborted` 分支 | §5.4 |
| 模型反复重试"参数错误" | 本该是"合法但被拒绝"的情况被 throw 成了错误结果 | §5.4 |
| 删掉调用者自己所在的会话后数据不一致 | 缺少"拒绝核销自身"的显式拒绝 | §5.5 |
| **删完了、界面那行还在**（重启才消失） | 没广播**宿主自己**会发的那条事件 | §4.7 |
| **记账摘了但文件还在** → 掉进"未分组" | 顺序错：先动记账后删文件 | §4.7 |
| 部分清理失败但没人知道 | 只 `logger.warn`（桌面端看不到日志） | §4.7 |
| schema 写不出想要的约束 | 无 `anyOf`/`allOf`；顶层 `oneOf` 与 `properties` 互斥 | §5.3 |

### G. Host 改了状态、界面不知道

| 你看到 | 原因 | 去哪 |
|---|---|---|
| 数据变了界面不更新 | 没有走白名单内事件、也没有自己的带鉴权路由 | §4.5 |
| 自定义事件发不到浏览器 | 转发清单硬编码，插件加不进去 | §4.5 |
| 补一条刷新反而渲染错乱 | 引入了**第二个写入者**（§11） | §11 |

### H. 安装 / 命名 / 装卸

| 你看到 | 原因 | 去哪 |
|---|---|---|
| `ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER` | 路径含空格被 shell 切开 | §6.6 |
| 改包名后加载失败 | 包名 / factory `id` / profile 三处没同步 | §6.5 |
| 已装状态下再安装报 `ambiguous-install` | 没有可提交的依赖差异 → 先 `remove_bundle` | §6.4 |
| 卸载后 node_modules 里还留着软链接 | Windows 上 pnpm 的清理行为（无害） | §6.4 |
| 安装/重载时报"目标匹配不到行" | patch 里留着指向已删插件的覆盖项 | §6.2 |
| 分不清改的是哪一份 | 同包名同版本放了两份 | §6.1 |

---

## 11. 一条贯穿全局的规则：同一份状态只留一个写入者

**两个真实反例：**

- **客户端**：Host 删掉数据后，为了让界面同步而**额外**加一条"全量重拉列表"，结果它与另一条记账链打架
  —— 一个已从 A 处移除、还没从 B 处移除的对象会被渲染成"未分组"。
- **per-agent 注册**：注册在 `agent.ctx` 上的东西有**两个拥有者**（agent 与被注册者），只靠其中一个释放就会泄漏。

**规则**：先决定**谁是这份状态的唯一写入者**，再写代码。需要第二条通路时，先问"它和第一条会不会打架"。

---

## 12. 验收清单

### 12.1 交付流程

1. **先定结果与目标位置**（未指定的可视位置 = 当前 DSH Web UI）。先做出能装上的小版本，再打磨视觉。
2. **只发现该版本需要的 API**：`cordis_inspect_list` → 定向 `cordis_inspect_query`。
3. **写代码前过一遍 §2 的 12 项。**
4. **安装**：`install_bundle`，读 `application` / `warnings` / `diagnostic`。
5. **验证**（按风险选层，§12.2）。
6. **在同一插件里修观察到的缺陷**；结果工作后收尾，不要继续投机性变体。

### 12.2 按风险的验证梯度

| 层 | 手段 | 能证明什么 |
|---|---|---|
| 1 | `node --check` 每个 JS 文件 | 语法 |
| 2 | manifest 自检（**跑脚本**：`版本快照/0.2.0-rc.2/_tools/清单自检.mjs`）——`main`/`exports`/`files` 路径存在、`locale` 形状、client 的 `load id`、patch 存在、`Config` 形状、若声明 peer 则名字与范围 | 可安装性（专抓静默失败） |
| 3 | `install_bundle` 返回的 `application` / `warnings` / `diagnostic` | 是否已生效、失败原因 |
| 4 | `Config.listConfigs` 的 `status` | **模块加载 ≠ 激活成功** |
| 5 | 活体验证（调一次工具、发一次无凭据探测、读一次端点） | 真能工作 |
| 6 | `Slots.listSubTree` 看到自己的 occupant 且 `active: true` | 注册成功 |
| 7 | 视觉验证（有浏览器控制时）；**Client 改动没体现时，先刷新跑一遍排除时序** | 用户看到什么 |

**改动越危险（写端点、删数据、改权限），越要走到第 5 层。**

### 12.3 环境限制（别在这里浪费时间）

- 优先用**已连接 Harness 的已认证页面**。
- **不要**从 shell 另起浏览器、不要改 `HOME`、不要翻个人浏览器 profile、不要搜认证令牌、不要动 keychain 来换截图。
- 无浏览器控制时，视觉类验证**限于**语法 + manifest + 实时槽位，并**明确报告可视验证不可用**。
- **不要**去找光栅化器、调 Quick Look、把 SVG 抽成预览文件、模拟 React/DOM 或自造渲染器。
- **mock 页面的截图不是运行中插件的验证。**
- **首次安装前不要**造预览 HTML、mock 外壳、设计变体、截图脚本 —— **用装好的插件本身当第一份预览**。

---

## 13. 一页速查

```
插件    导出 apply(ctx, config) 的模块 / Service 子类
ctx     服务容器（ctx.tools / ctx.sessions / ctx.slots ...），通过 key 取，不 import 实现
inject  硬依赖；软依赖用 ctx.inject(['x'], sub => ...)；ctx.get 是 strict 的（仅用于逐请求重解析）
effect  注册 = 可逆副作用（工具/槽位/路由/定时器都包一层）
事件    emit / waterfall / parallel / serial / bail；不拥有决策的 waterfall 必须 return next()

清单    name 是身份；main+exports["."] 必须有；Client 要 exports["./client"] + dsh.client
        icon ≤256KiB 相对路径；meta 或 locale/*.json 是"管理页"文案（≠ 运行时文案）
patch   顶层数组；insert 追加；{ id, config } 覆盖且 config 整体替换；!!js 不写 !js
        删插件时顺手删掉指向它的覆盖项

安装    plugin_manager install_bundle，target = 绝对包目录；CLI 路径含空格要加引号
诊断    application/warnings/diagnostic + Config.listConfigs 的 status
        "failed to import" 是兜底文案；带 stack 的才是真错误
        status: schema=原生Config / absent=没导出Config(正常) / unsupported=形状不对 / inactive=没激活
换代    同进程一个模块只求值一次；toggle 与重装都不换世代
        ✅ hmr 行 config.root = [你的 src]；❌ 换路径（旧世代不卸载）
        配了 hmr.root 之后【两半都会热重载】（Client 经 SSE 的 rebuilt 帧换版本）
        改动没体现时先刷新一次——那是排除时序的判据，不是换代码的手段
装卸    已装状态下再 install_bundle → ambiguous-install，先 remove_bundle 再装
        卸载清清单+锁文件；Windows 可能残留 junction（无害）

import  ⚪ 推荐零 @deepseek-ai/* import：profile 装法的解析路径上通常没有它们
        真要用就声明成 profile 依赖；服务从 ctx 取
peer    可选。声明了才有兼容门：写错范围 → 整包被跳过；要声明就钉精确版本
Config  必须是原生 schemastery；写不出就别导出（推荐）—— 原始 config 会进 apply
        可调值放行 config，代码里防御性读

UI      __ModuleLoader__.load({ id: 包名, factory(require) {...} })
        ctx.slots.inject(key, () => ctx.slots.register(row, Component))
        props 从 Slots.listSubTree 读（标准 props + ownerProps + hookContext）
        只用 --dsw-alias-* 令牌；浮层走 shell.overlay，不要自己 portal
        动态模块包可 require 平台种子表（含 ui-primitives）；解构前核对导出存在
文案    locale: NS 只给 t；必须 ctx.locale.register(NS, { zh, en })
        ⚠️ 座位不能无条件信：命名空间没字典时 translate 兜底 `?? key`
           → 只在"非空且 != key"时用它，否则回落内置字典（否则首次打开显示裸键）

改动宿主状态（删除/改归属）
        顺序   flush → 删 → **验证真没了** → 最后才动记账
        广播   发**宿主自己**会发的那条事件（删文件不会 dispose → 界面不会自己更新）
        写入   优先公开 API；没有才直写活表（内存态），并注释原因
        失败   部分失败收集成 degraded[]，随报告返回（桌面端看不到 logger）
        反例   再补一条"全量刷新"= 第二个写入者 → 渲染错乱（§11）

工具    ⚠️ 手写 JSON Schema 注册时【注册表不校验参数】→ execute 里自己防御性读
        参数不可用 / 执行异常 → throw；合法但被拒 / 执行失败 → 返回文本
        取消 → 什么都不做（框架替换为 ABORTED）
        schema 无 anyOf/allOf，顶层 oneOf 与 properties 互斥
        一个操作一份实现，界面/工具/路由共调；拒不得核销自身
        验工具行为只能派子代理调用（Tool provider 不能调）

路由    webServer 无鉴权；exact 路由优先于 401 fallback
        → 必须自己 ctx.connection.requestRejection({ headers })，失败关闭，检查放最前
事件    只有白名单内宿主事件能到浏览器；已有 Remote 命名空间可以用，但不能加新的
        "失败要让人知道"必须并进返回给调用者的报告（桌面端看不到 logger）

验证    node --check → manifest → application/warnings → status → 活体 → 槽位 → 视觉
```

---

## 14. 方法论：观测与结论的距离

上面每条"实测"背后都对应过一次判断失误，而且几乎都是同一类：
**拿一个能观察到的现象，去担保另一个没有观察的事实。**

| 曾经的错误判断 | 错在哪 | 怎么办 |
|---|---|---|
| "所有 `@deepseek-ai/*` import 都失败" | 把**兜底文案**当证据；没做单变量对照 | 换掉那一个 import 就成功 → 真因是解析路径 |
| "新装的失败、已装配的成功" → 标成**未定论** | 放弃归因，而不是补观测 | 问"两组差在哪一个变量上"，一轮对照结案 |
| "`ctx.get` 能取到异步服务" | 源码推断当事实 | 实测 `undefined` → 改 `ctx.inject` |
| "目标还在不在列表里"当判据 | 判据本身无区分能力 | 任何被删对象都会立刻离开列表 |
| 补一条刷新绕开竞态 | 引入第二写入者 | 与另一条链打架 → 渲染错乱 |
| "换路径可以强制新世代" | **只验了想要的那一半** | 副作用才是关键：旧世代不卸载 → 改成 HMR |
| 头部字段记成 `offset 8 = JSON 长度` | 凭记忆写断言 | 实测 8 比 12 大 4 |
| 读长 4 字节 + 起点偏 4 字节 | **两个错误互相抵消**，输出一直"能用" | 逐个验中间量，而不是只验最终结果 |
| "peer 必要但不充分" | 归因错误 | 报错无法区分是哪个 import 失败 |
| "文档里这么写的，所以对" | **把描述当契约**：`locale/*.json` 的嵌套形状，本文档自己曾教成扁平 | 拿**真实产物**对照（照抄读取器的判定逻辑跑一遍），别信描述 |

> **形状类契约最容易"看起来对"**：文件存在、JSON 合法、key 也拼对了，只是层级差一层 →
> 不报错、不生效。凡是"结构/嵌套/形状"这类约定，都要**至少拿一个官方产物对照一次**
> （本版本 asar 里 20 份 `locale/*.json` 全是嵌套），并把判定逻辑固化成机检
> （见快照夹的 `_tools/清单自检.mjs`），而不是留给下一个人用眼睛看。

**六条可操作规则**

1. **能区分归因的证据才叫证据。** `Config.listConfigs` 的 `status` 能区分"模块加载成功"与"激活成功" → 值得写进文档；`failed to import` 不能区分 → 不该支撑机制结论。
2. **推断要标注为推断**，并与实测分开（本文档用 ✅/📖/⚠️）。**"无法解释"只在试过单变量对照且排除全部候选之后才配写。**
3. **同一份状态只留一个写入者**（§11）。
4. **快照类结论有保鲜期**：进程启动时间、profile 内容、版本号、端口都会变 —— **引用前重新取一次**。
5. **自己写的东西也要逐字执行一遍**，尤其是标了"已验证"的代码片段。
6. **验证一个"能用"的方案时，把它的副作用也当待验项。**

> ⚠️ 第 5、6 条最难发现的变体：**输出正确 ≠ 推导正确。**
> asar 探针曾同时犯两个错（长度读大 4 字节、起点偏 4 字节），两者恰好抵消 → 它**一直"能用"**。
> **可操作的做法：验中间量。** 凡是**由多个量共同决定**的结果（偏移 + 长度、路径 + 模式、超时 + 重试），
> 都要能分别说出每个中间量**应该**是多少 —— 否则一个错会被另一个错盖住。

---

## 附录：可复跑的判据

| 想知道 | 判据 | 期望 |
|---|---|---|
| 插件这次生效了吗 | 安装返回的 `application` / `warnings` | `applied` + `[]` |
| 模块加载**且**激活成功 | `Config.listConfigs` 的 `status` | `schema`（有原生 Config）或 `absent`（没有，正常） |
| `Config` 形状对不对 | 同上 | 出现 `unsupported` 就是形状不对 |
| 自建路由接上宿主信任策略 | 无凭据 POST 你的路由 | `401`/`403` **且响应体是你自己的 JSON** |
| 精确路由是否真的优先 | 无凭据 POST 一个**不存在的路径** | 405/静态层（对照项） |
| 槽位注册成功 | `Slots.listSubTree` 的 `occupants` | 有你的 `id` 且 `active: true` |
| 异步服务能不能 `ctx.get` 到 | `apply` 里 `ctx.get('<name>')` | 异步服务得到 `undefined` → 用 `ctx.inject` |
| 某个包能否被 import | §9.1 的解析路径规则 | profile 装法：不在路径上 → 失败 |
| 工具参数会不会被校验 | 用**错误类型**的参数调一次 | 写法 B **不校验**（值会进 execute）—— 自己防 |
| 工具的真实返回形态 | **派子代理调用它** | `Tool.listTools` 只能列 schema |
| 新代码是否在跑（Host） | 文件 mtime **vs** 进程启动时间 | 进程启动更晚 = 新世代 |
| 想不重启就换世代 | `hmr` 行 `config.root` 含源码目录 | 改文件即重载 |
| 卸载是否干净 | `remove_bundle` 后按包名查 `listConfigs` | 空目录 |
| Client 改动要不要刷新 | 改后行为没变时，先刷新一次再看 | 刷新后变了 = 本来已生效（时序）；仍没变 = 没配 `hmr.root` 或文件不在监视范围内 |
| 管理页为什么没图标/标题 | 检查 `icon`（≤256 KiB、相对路径）与 `locale/*.json` | §6.1 |
