# DeepSeek Harness Plugin Development Guide

> [中文](DSH-插件开发指南.md) ｜ English
>
> *English mirror of `DSH-插件开发指南.md`; that Chinese file is the source of truth if they disagree.*

> **How the three kinds of file divide the work**
>
> | File | What is in it | When to read it |
> |---|---|---|
> | **This document** (mechanisms and criteria) | How to write the manifest, register a slot, define a tool, and where the traps are. **It contains only things that do not change with the version** | While writing code |
> | [**Workflow: from lookup to code**](DSH-插件开发工作流.en.md) (order of actions) | Seven stages: frame → evidence → copy a reference (`_ref/`) → write → install → verify → close out | Once, **before you start** |
> | [**版本快照/**](版本快照/README.en.md) (values queried on one version) | Slot ownerProps, seed-table members, one package's field table, diagnostic text, **and a complete two-half minimal implementation** | When you need to know "what exactly is this name/field called", then **re-query it on your own version** |
>
> Reading only this document turns into "trial and error against the API"; reading only the workflow leads to wrong fields; **treating the snapshots as an interface** breaks on the next version.
> **This document does not carry version data; the body only points at `版本快照/<version>/` when needed** — that is
> its one structural discipline, and §2.2 gives the reason.
>
> **Baseline runtime**: `@deepseek-ai/dsh` `0.2.0-rc.2` (Windows desktop + Web) — **the only version statement in the whole document**.
> Everywhere else a version number appears only inside a **snapshot path** (`版本快照/<version>/…`) or explicitly marked as "at the time (`<version>`)".
> For everything that drifts with the version (version numbers, slot names, export names, paths), this document gives the **command to check it on the spot**;
> your own machine's measurement is the authority.
>
> **Evidence markers**
>
> | Marker | Meaning |
> |---|---|
> | ✅ | Measured on this machine; the command and its output are reproducible |
> | 📖 | From bundled documentation or source, not re-run here |
> | ⚠️ | **Risk note** (not "unsure", but "this has a known cost") |
>
> **This document keeps no "uncertain" entries**: anything unclear is either deleted or given **a criterion that settles it**.
> To reproduce every conclusion here, follow §3 (the `_ref/` protocol) and §8 (when a conclusion is allowed) of the [workflow](DSH-插件开发工作流.en.md).

---

## What I want to build → which section to read

> **How to use this table**: find your goal on the left → read the right column in order. **The first stop is always the [workflow](DSH-插件开发工作流.en.md)**
> (the order of actions before writing); the rest is ordered "mechanism first, values after".
> The "Snapshot" column points at a **value queried on one version** under [`版本快照/<version>/`](版本快照/); §2.2 explains how to use it.

| What I want to build | Read this | Snapshot |
|---|---|---|
| **First time**: install it, see it, confirm it is alive | §0 here; the whole [workflow](DSH-插件开发工作流.en.md) | [Minimal implementation](版本快照/0.2.0-rc.2/最小实现/demo-plugin/) |
| A Host-only plugin (no UI) | §3.1 → §8 (services / projections / events / timers) | — |
| Add UI: a button / a menu row / an overlay | §3.2 → §7.2 (lanes and the seed table) → §7.5 (slot registration) → §7.3 (styling) | [seed table](版本快照/0.2.0-rc.2/seed-table.en.md), [slot ownerProps](版本快照/0.2.0-rc.2/slot-owner-props.en.md) |
| UI text must follow the language / you see raw keys | §7.4 | — |
| Add an agent tool | §5 (**§5.2 on argument validation is required reading**) | — |
| Add your own HTTP endpoint | §4.4 (**authentication is required reading**) | — |
| Add prompt text / runtime context / timer wake-ups | §3.5 | — |
| Connect an MCP server (config only, no code) | §3.6 | [mcp-client fields](版本快照/0.2.0-rc.2/mcp-client-fields.en.md) |
| Define an agent preset | §3.7 | — |
| **Change or delete the host's own state** (the most dangerous) | §4.7 + §11 (single writer) + §5.5 (refusing to consume yourself) | — |
| Give the plugin a tunable switch | §9.4 (`Config` shape, and "prefer not to write one") | — |
| Manifest fields, patch semantics, install / generation / uninstall | §6 as a whole | — |
| **"My change did not take effect" / "it installed but never started"** | §10 troubleshooting index → §6.3 (module generations) → §9.2 (diagnostic entry points) | [diagnostic text](版本快照/0.2.0-rc.2/diagnostic-text.en.md) |
| Find out what a name / field / export is really called | §2.1 (inspection quick reference) | the matching snapshot file |
| Read bundled documentation / source / types | [workflow](DSH-插件开发工作流.en.md) §3 (the `_ref/` protocol) | [_tools/asar-extract.js](版本快照/0.2.0-rc.2/_tools/asar-extract.js) |
| **Before delivery**: run everything a machine can check | §12 (acceptance list and verification gradient) | [_tools/清单自检.mjs](版本快照/0.2.0-rc.2/_tools/清单自检.mjs) |
| Discipline for writing documentation / drawing conclusions | §14 methodology; [workflow](DSH-插件开发工作流.en.md) §8 | — |

---

## 0. Five minutes: a minimal plugin that installs and shows up

> The five files in this section are a **fragment-style** skeleton. **The complete two-half implementation (tool + authenticated route + real slot + locale fallback)
> lives in the snapshot folder and can be installed and run as is**: [`版本快照/0.2.0-rc.2/最小实现/demo-plugin/`](版本快照/0.2.0-rc.2/最小实现/demo-plugin/).
> It is also a **snapshot**: every slot name, export name, and token name in it must be re-queried on your own version.

### 0.1 Directory

```
my-plugin/
├── package.json        manifest: dsh.bundle (+ dsh.client when there is UI)
├── cordis.patch.yml    insert your plugin row into the Loader composition
├── index.js            Host half
├── client.js           browser half (delete it when there is no UI)
├── icon.svg            Plugin Manager page icon
└── locale/
    ├── zh.json         manager-page title/description: {"meta":{"title":…,"description":…}} ← must be nested
    └── en.json         (a different thing from runtime copy; runtime copy is §7.4)
```

### 0.2 Five files

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
  "meta": { "title": "My Plugin", "description": "Draws one line under the composer." },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web" }
  }
}
```

- `main` + `exports["."]`: the Host entry point. **Required** (without it the package installs but never activates).
- `exports["./client"]`: the browser half's entry point. Delete the whole section when there is no UI.
- `exports["./package.json"]`: the settings and manager pages read the manifest.
- `icon` + `meta`: display information readable **without activating the plugin** (§6.1).
- Do **not** copy someone else's `peerDependencies` "to be correct": it is optional, and a wrong range can get the whole package blocked (§9.3).

**`cordis.patch.yml`**

```yaml
- insert:
    - id: my-plugin              # row id: stable, so a higher-priority patch can target it
      name: "@local/my-plugin"   # package name, not a path
```

**`index.js`** (Host half)

```js
export function apply(ctx, config) {
  // Declare only what you need: export const inject = ['tools']
  // Optional services go through ctx.inject(['x'], (sub) => ...), never into inject
}
```

**`client.js`** (browser half)

```js
window.__ModuleLoader__.load({
  id: "@local/my-plugin", // ← must match package.json's name exactly
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
      // `locale: NS` only injects t; you must register the dictionaries yourself, or the UI shows raw keys (§7.4)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "my-plugin: dictionaries");
      // ⚠️ this slot name is only an example: confirm it is available with Slots.listSubTree before writing (§3.2)
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

**`locale/zh.json`** (`en.json` has the same structure)

```json
{ "meta": { "title": "我的插件", "description": "在输入框下方显示一行字。" } }
```

> ⚠️ **It must be nested under `meta`.** A flat shape with `title` / `description` at the top level
> **raises no error but is ignored entirely** — the reader only looks at `parsed.meta`, so the display quietly falls back to
> `package.json`'s `name` / `description`. Note that this is a **different shape from `package.json`'s own `meta` field (which is flat)**;
> it is the single easiest thing to get wrong in this document.

### 0.3 Install it and confirm it is really alive

```
plugin_manager { action: "install_bundle", target: "<absolute path of this directory>" }
```

Then check four things **in order** (all four matter):

| Criterion | Expected | Note |
|---|---|---|
| The install result's `application` | `"applied"` | `failed` / `restart-required` both need handling |
| The install result's `warnings` | `[]` | A non-empty list means fix what it names |
| `Config.listConfigs { name: "<package>" }`'s `status` | `absent` (= no `Config` export, normal) or `schema` | **`inactive` = the row never activated; `unsupported` = the `Config` shape is wrong** (§9.4) |
| `Slots.listSubTree { root: "conversation.composer.dock" }`'s `selected.occupants` | contains your `id` with `active: true` | proves the registration succeeded |

**Refresh the page** to see what is actually drawn. Do **not** substitute panel text, terminal output, or logs for those four checks.

### 0.4 Four things you are certain to hit

1. **My code change did nothing** → one module is evaluated once per process. Add an `hmr` watched directory, or restart (§6.3).
2. **I want to reinstall the same package** → `install_bundle` while it is installed reports `ambiguous-install`; **remove it first** (§6.4).
3. **I want to see the real error** → read the returned `diagnostic` (it carries a stack); `failed to import` is only a fallback string (§9.2).
4. **I want UI but cannot find a slot** → query `Slots.listSubTree` first, then write code (§3.2, §7.5).

### 0.5 Do not rush to copy: walk the workflow once

The example above is a **finished product**, not a **starting point**. When you actually begin your own plugin, read
[Workflow: from lookup to code](DSH-插件开发工作流.en.md) first — it turns "how to ask, which reference to copy, when it counts as verified"
into seven stages and gives a six-step bisection for when you are stuck. **That step saves far more rework than the ten minutes it costs.**

Two habits to build first:

- **Before writing, extract the relevant docs and reference implementations into `_ref/`** (bundled docs live inside `app.asar`, which ordinary commands cannot read) —
  §3 of the workflow gives an extraction script you can keep;
- **Every name (slot / method / export) needs a source**, never write it from memory — a wrong name does not fail loudly, it goes blank or silently does nothing.

---

## 1. Mental model

DSH's plugin system is **Cordis**. Five things are enough:

**① A plugin = a module with `apply`** (or a Service subclass)

```js
export function apply(ctx, config) {}
export const inject = ['tools']   // optional: hard dependencies
// export const Config = ...      // optional: see §9.4, profile plugins usually should not
```

**② `ctx` = the service container.** Services occupy stable keys (`ctx.tools` / `ctx.sessions` / `ctx.slots` …).
A plugin **looks services up by key and never imports the implementation** (§9.1 explains why this matters so much in this runtime).

**③ Dependencies are hard or soft**

```js
export const inject = ['tools']              // hard: wait for it; without it the plugin does not start
ctx.inject(['webServer'], (sub) => { ... })  // soft: use it when present, skip quietly when absent
```

`ctx.get(name)` is **strict**: it only returns a service whose providing fiber is already active, so an asynchronously activated service
reads as `undefined` at `apply` time. Therefore **soft dependencies always use `ctx.inject`**; `ctx.get` is only for "re-resolve on every request" (§8.1).

> ⚠️ **Do not write a "`ctx.get` fast path + `ctx.inject` fallback" pair**: the two branches attach their effects to **different contexts**
> with different lifetimes (one follows the plugin, one follows the service), and unload leaks.

**④ A registration is a reversible side effect.** Tools, slots, routes, listeners and timers are all installed with `ctx.effect()` / `ctx.on()`:

```js
ctx.effect(() => ctx.tools.register(def), 'my-plugin: tool')
ctx.effect(() => {
  const id = setInterval(tick, 5000)
  return () => clearInterval(id)
})
```

The returned disposer is called by the **owning context** on unload / hot reload / disable — that is the entire reason plugins do not leak.

**⑤ Events have five dispatch modes** (query each event's mode with the `Event` provider of `cordis_inspect_query`):

| Mode | Awaited | Order | Return value |
|---|---|---|---|
| `emit` | no | registration order | no |
| `waterfall` | no | around-middleware | yes |
| `parallel` | yes | all in parallel | no |
| `serial` | yes | registration order | yes |
| `bail` | no | registration order, stops at a bail value | yes |

A `waterfall` listener receives `(...args, next)`. **Only the listener that owns the decision may short-circuit; an observer must `return next()`.**

### 1.1 Six design principles

1. **The session log is the only source of truth.** Everything the model can see must be reconstructable from committed session events (fork/resume/replay all derive from the log). Plugin memory is only a derived cache.
2. **Registrations are owned by a context.** Choose the owner first; when a registration lives on someone else's context (such as `agent.ctx`) **it has two owners**, so keep its disposer in your own effect as well.
3. **The framework drives, the plugin computes.** Session projections, Conversation assembly and slot rendering already subscribe, cache and publish for you. Subscribing, rescanning or writing DOM yourself bypasses the incremental machinery.
4. **Extension points are shared; use the weakest mechanism that suffices.** `ctx.tools.restrict()` (remove only) → `ctx.tools.guard()` (deny only) → waterfall (can rewrite, order-dependent) → `system-prompt/assemble` (replaces the whole assembly).
5. **Other plugins and other versions will read what you write.** Declare compatibility through the envelope fields and versions; **do not** append session events with a new `type` (§8.3).
6. **Plugin UI is part of the Harness UI.** Use the host's theme tokens, locale and layout patterns. **Choose the rendering surface before writing the view** — pick wrong and no amount of later styling saves it.

---

## 2. Before writing: 12 checks

| # | Check | How to check | Cost of skipping it |
|---|---|---|---|
| 1 | The target slot exists and you know its props | `Slots.listSubTree { root }` | You discover after writing that the slot does not exist or hands you no data |
| 2 | The signature of the Host service method you call | `Service.listService { service }` | Wrong method name or parameters |
| 3 | The event name and its **dispatch mode** | `Event.listEvents` | A waterfall without `next()` short-circuits the whole chain |
| 4 | Whether the packages you import **are on the resolution path** | the rule in §9.1 | A bare `@deepseek-ai/*` import → the whole row fails to import |
| 5 | `ctx.get` or `ctx.inject` | that service's `access.optional` field | An asynchronously activated service reads as undefined |
| 6 | Whether the Client module you need is in the **platform seed table** | §7.2 | `require` returns `undefined` → the whole slot goes blank |
| 7 | Which **lane** the Client half belongs to | the lane table in §7.2 | A forbidden import in that lane → blank slot |
| 8 | The namespace and dictionaries for visible copy | §7.4 | The UI shows raw keys |
| 9 | **Authentication** for a self-built Web route | §4.4 | **Any web page can operate your plugin** |
| 10 | Whether the tool's argument constraints **can be expressed** | §5.3 | Designing a constraint that cannot be expressed |
| 11 | Whether a change needs a restart / refresh | §6.3 | You believe it took effect when it did not |
| 12 | The source directory of a reference implementation | `Config.listConfigs { entry }`'s `packageDir` | Guessing from `$DSH_PROFILE_DIR` and failing |

> The premise of #12: **only a row that exports a native `Config` has a `packageDir`**. The style this guide recommends (no `Config` export)
> leaves it empty — in that case read your own plugin directory, or use the probe in §9.5 against the installation directory.

### 2.1 Inspection quick reference

```
cordis_inspect_list                      # first, see which providers exist
```

| What you want to know | platform | provider | method |
|---|---|---|---|
| Services and method signatures | host | `Service` | `listService` (pass `service` for details) |
| Event names and dispatch modes | host | `Event` | `listEvents` |
| A plugin's Config JSON Schema | host | `Config` | `listConfigs` (filter by `name` first, then query the `entry`) |
| The tools I can call | host | `Tool` | `listTools` (**lists schemas only; it cannot call**) |
| The slot tree / props / occupants | client | `Slots` | `listSubTree` (pass `root`) |
| Theme tokens | client | `Theme` | `listTokens` |
| Built-in symbols available to the Client | client | `Builtin` | `listBuiltins` |

> ✅ The `Tool` provider has **no** "call" method. To verify a tool's real behavior you must **call it through an agent**
> — when this session does not have it, **dispatch a subagent to call it** (that is how this document's two tool conclusions were measured; see §5.2 and §5.4).

### 2.2 Which things are "version data" and which are "long-term facts"

**This document deliberately contains only the latter.** The right move for the former is to **check it on the spot**, never to copy it into code or notes.
The table below is itself the instruction manual for these documents — please trade the urge to memorise names for running one command:

| Version data (**do not memorise; query it**) | The command that queries it |
|---|---|
| Slot names, whether a slot exists, its props / hooks | `Slots.listSubTree { root }` (read `purpose` to choose a location) |
| Seed-table members, whether an export exists | §9.5's probe extracts the frontend artifact; then check the export name |
| Theme token names | `Theme.listTokens` |
| A service's method signature, parameters, return value | `Service.listService { service }` |
| Event names and dispatch modes | `Event.listEvents` |
| One package's config fields and defaults | `Config.listConfigs { name }` / `{ entry }` |
| The keyword vocabulary of a tool schema's parameters | read `dsh-tools`' schema compiler (style A) / check yourself (style B, §5.1, §5.3) |
| Which packages and versions exist in the runtime | §9.5's asar probe |
| A package's implementation details and internal conventions | extract to `_ref/` per workflow §3 and read the README and `lib/*.js` |
| What injections a Client closure receives | `Builtin.listBuiltins` |
| Composition layering, patch semantics, install / generation / uninstall | **long-term facts**, see §6 (the mechanisms do not get renamed) |
| The `ctx.effect` / `ctx.inject` / registration ownership model | **long-term facts**, see §1 (the style does not change with versions) |

**Two disciplines for using this document:**

1. Any **concrete name** you read here (slot name, token name, export name, field name) is
   "**the value the author queried on that version**"; before writing, query it again with the matching command above.
2. Conversely, the lists this document **omits** (the full slot table, the full token table, the full export table) are **deliberately omitted** —
   hardcoding a table that will expire is worse than omitting it: readers will treat it as an interface.

**Where version data lives: `版本快照/<version>/`.**

When this document needs to show "what it looks like" (for example a slot's `ownerProps` interface or an exact diagnostic line),
**only two forms are allowed**:

- **A pointer**: `→ 版本快照/<version>/<file>.md` (no value appears in the body);
- **An inline example explicitly labelled** "this is a snapshot of one version; write what you yourself query".

The forbidden third form: leaving the value in the body and propping it up with a "⚠️ may be outdated" warning. **Readers skip warnings.**
The correct move is for it to **be structurally absent** — move the value into the snapshot folder and keep only "where to look it up" in the body.

> The snapshot folder holds "the query results of one version"; `_ref/` holds "the reference implementation you are about to copy right now". Neither is a **deliverable**:
> both are discard-after-use, re-query-after-upgrade. The only difference is that one is archived per version and the other is created per task.

---

## 3. Recipes: pick one for what you are building

Each recipe is self-contained: manifest fragment → patch fragment → code → verification.

### 3.1 A Host-only plugin (no UI)

The minimal manifest (**no** dependencies, build scripts or build tool needed):

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

Write `index.js` by the rules of §8; there is no `dsh.client` and no `client.js`.

### 3.2 Adding UI: the Client half + a slot

1. Add `exports["./client"]` and `dsh.client` to the manifest (see §0.2);
2. Find a slot that **already allocates space** with `Slots.listSubTree { root }`;
3. Write `client.js`: register the factory → `ctx.slots.inject` + `ctx.slots.register` inside `apply(ctx)`;
4. Copy goes through the locale service (§7.4); styling uses only `--dsw-alias-*` tokens.

**How to find a slot (do not rely on remembered names)**:

```
Slots.listSubTree                       # without root: the whole slot tree, to find "where this thing belongs"
```

`listSubTree` gives every slot a **`purpose` (what this location is for)**, plus `kind`, `scope`,
`replaceRisk` and the `registration` contract. **Choose by `purpose`, not by guessing from the name** —
a name only says where it sits in the tree.

> ⚠️ **A slot name is "declared by some package"**, not a fixed DSH interface. Changing the composition (installing or removing other bundles)
> can remove it, and a version upgrade can rename it. So: **confirm `available: true` with `listSubTree` before writing code**,
> and use `ctx.slots.inject()` (it waits for the declaration and removes your entry when the declaration collapses) rather than a bare `register`.
>
> This document **does not list "commonly used slot names"**: that is version data, and hardcoding it misleads. The location you want is obvious from
> `listSubTree`'s `purpose` (descriptions like "the rows of a session row's '...' menu").
> To copy a working example, extract the package that declares the slot per workflow §3 and see how it registers entries of the same kind.

### 3.3 Adding an agent tool

See §5 (including the **required** truth about argument validation).

### 3.4 Adding an HTTP endpoint

See §4.4 (including the **required** section on authentication).

### 3.5 Adding prompt text / context / timer wake-ups

Both interface shapes are verified (✅ `Service.listService { service: "systemPrompt" }`):

```ts
interface PromptSection {
  readonly name: string
  readonly order: number                                    // required; a non-finite value throws
  readonly text: string | ((ctx: AssembleContext) => string)
  readonly interpolate?: boolean
  readonly complete?: boolean                               // true = becomes the only prompt section
}
interface PromptContext {
  readonly name: string
  readonly order: number
  readonly text: string | ((ctx: AssembleContext) => string)
}
// AssembleContext = { scope?: ScopeKey; signal?: AbortSignal }
```

```js
ctx.systemPrompt.section({ name: 'my-section', order: 100, text: () => '...' })  // prompt section
ctx.systemPrompt.context({ name: 'my-ctx',     order: 100, text: () => '...' })  // runtime context
```

- On a name collision, **this context's scope shadows the global one**; a duplicate name within one layer or a non-finite order throws.
- Both registrations return a disposer and both emit `system-prompt/change`.
- To get a repository's preset ordering by name, use `getSectionOrder(name)` / `getContextOrder(name)`.
- For a "tool the model can call" use `ctx.tools.register` (§5), **do not** push tool schemas through `systemPrompt.tools()`.
- Per-agent registrations are made with the `agent.ctx` obtained in `agent/created` (§4.1).

**Timers and wake-ups**:

- A timer that starts work calls `agent.followup()` (**wakes** the agent); `agent.inject()` does **not** wake it, so injected context can wait in the inbox forever.
- A timer must be cleared in the effect that owns it.
- Do not listen to `system-prompt/assemble` in order to add tools or text (that is the "expert-level waterfall", the strongest mechanism).

### 3.6 Connecting an MCP server (config only, no code)

The manifest only needs `name` / `version` / `dsh.bundle.patch`, with **no entry file**.

```yaml
- insert:
    - id: demo-mcp
      name: "@deepseek-ai/dsh-mcp-client"
      config:
        serverName: demo                 # required
        transport: streamable-http       # required: stdio or streamable-http
        url: http://127.0.0.1:3000/mcp   # for streamable-http
        # command: node                  # for stdio (optional args / env / cwd)
        failOnStartupError: true         # defaults to false
```

**The fields and their defaults are that package's own version data**; check them with one command before writing (more reliable than a table):

```
Config.listConfigs { name: "@deepseek-ai/dsh-mcp-client" }
```

The field table queried at the time (`0.2.0-rc.2`) → [`版本快照/0.2.0-rc.2/mcp-client-字段.md`](版本快照/0.2.0-rc.2/mcp-client-fields.en.md).
**Do not copy that table into code as an interface**: only two statements are long-term facts —

- The tool name shape is `mcp__<serverName>__<rawName>` (e.g. `mcp__demo__ping`); use it to verify the connection;
- **Environment credentials are scrubbed**: reference existing credentials with Loader `!!js`, and never paste secrets into conversation text.

### 3.7 Agent preset (defining a set of agent capabilities)

A preset is an **ordinary declaration** carried by `@deepseek-ai/dsh-agent-preset`; nothing edits it in place.

```yaml
- insert:
    - id: preset-review                 # Loader row id convention: preset-<id>
      name: "@deepseek-ai/dsh-agent-preset"
      config:
        id: review                      # required
        name: Review                    # optional
        description: Reviews changes.   # optional
        order: 10                       # optional
        plugins:                        # required: a list of Cordis rows
          - id: persona
            name: "@deepseek-ai/dsh-persona"
            config: { prefix: You review software changes. }
```

- At the time (`0.2.0-rc.2`) **only `id` and `plugins` were required**; the rest optional — that is version data, **re-query it every time with the method below**.
  How to check: `Config.listConfigs { name: "@deepseek-ai/dsh-agent-preset" }`,
  then look at the `required` array inside the returned `schema.anyOf` (✅ queried exactly `["id","plugins"]` on this machine)
- To change a shipped preset: **override** it by row id; `config` is replaced wholesale → **every field must be restated**
- **Verify behavior changes in a new session** (an existing session keeps the plugin revision it started with)

---

## 4. Beyond the UI: the Host half

### 4.1 Do not bypass the framework

**Stability**

- A waterfall listener that does not own the decision **must `return next()`**. When rewriting an `agent/pre-step` decision, **spread it** (`{ ...decision, messages }`), or fields such as `startsRequestSeries` are lost.
- A denial that must hold regardless of registration order uses `ctx.tools.guard()` (synchronous); a decision that must await something returns `ask` from `tools/pre-execute`.
- To hide tools from a single agent, use `ctx.tools.restrict()` **on that agent's context** — it keeps schema presentation, lookup and execution aligned.
- Observe the **final** outcome on `tools/result`; use `tools/post-execute` only to **transform a result**.
- Per-agent registrations go on the `agent.ctx` obtained in `agent/created`, wrapped in one `agent.ctx.effect()`, **and you must also keep that disposer keyed by agent in your plugin's own effect** (unloading the plugin does not by itself release registrations on `agent.ctx`).

**Performance**

- Keep per-session state derived from the log in a `ctx.sessionProjections` unit; **do not** subscribe to `session/event` and rescan `session.events`. `apply(state, event)` is pure and synchronous and **returns the same reference** for events it ignores → unchanged state costs nothing downstream.
- Keep projection state plain JSON; when fields or fold semantics change, **bump `stateVersion`** (the cache checkpoints by it and a cold read replays only the tail).
- Wait on **durable** events (`turn/end`, `assistant/message`, `tool/result`); render live tokens from `agent/assistant-stream`. **Do not** poll `agent/status`.
- `whenIdle()` **does not mean** some follow-up finished — several inputs can share one running interval.

### 4.2 Soft dependencies: `ctx.inject`

```js
ctx.inject(['webServer'], (sub) => {
  const webServer = sub.webServer        // the service on the child context; no need to get it again
  return sub.effect(() => webServer.register(route), 'my-plugin: route')
})
```

The callback signature is `(sub) => disposer`; it runs **immediately** when the service already exists and **again** if the service is ever replaced (the old effect is revoked automatically).
That works in your favour: **one registration path** covers both "present now" and "appears later".

### 4.3 Choosing an extension point: start from the weakest

| What you want | Use |
|---|---|
| Remove certain tools only | `ctx.tools.restrict()` |
| Deny certain calls only | `ctx.tools.guard()` |
| Add prompt text | `ctx.systemPrompt.section()` |
| Add per-agent context | `agent.inject()` (does not wake) |
| Rewrite requests / tool execution | waterfall (`agent/request`, `tools/pre-execute`, …) |
| Replace the whole system-prompt assembly | `system-prompt/assemble` (**the strongest**, and you must preserve everyone else's contributions) |

### 4.4 🔴 A self-built HTTP route: authentication is your responsibility

`webServer`'s contract states it plainly: **it provides no server-wide TLS, authentication, or origin policy**. And an **exact route takes precedence over**
the SPA fallback that answers 401 for unauthenticated requests. So the consequence of omitting authentication is not "too many permissions",
it is that **any web page can operate your plugin** (the threat surface is DNS rebinding and cross-site browser requests, not just local processes).

**Do this** (apply Connection's trust policy to your route, **failing closed**):

```js
function rejectUnauthenticated(ctx, req) {
  const connection = ctx.get('connection')          // ← read per request; do not cache at apply time
  if (connection === undefined || connection === null) return 401       // fail closed
  if (typeof connection.requestRejection !== 'function') return 401
  try {
    return connection.requestRejection({ headers: req.headers })        // 401 | 403 | undefined
  } catch {
    return 403
  }
}

// the handler's **first action**:
const rejection = rejectUnauthenticated(ctx, req)
if (rejection !== undefined) { sendJson(res, rejection, { error: 'unauthenticated request' }); return }
if (req.method !== 'POST') { sendJson(res, 405, { error: 'method not allowed' }); return }
// only then read the body
```

Four points:

1. **Put it before the `req.method` check and before reading the body** — not a single byte of an unauthenticated request should be read;
2. **Read `ctx.get('connection')` per request**, so a Connection that mounts later still applies;
3. **Fail closed**: without the service, prefer losing this UI path over leaving an unauthenticated endpoint;
4. `ConnectionTrustRequest` is exactly `{ headers }`, and `req.headers` satisfies it.

**Criteria (no credentials, no side effects, repeatable)** ✅ measured:

| Request | Expected | What it proves |
|---|---|---|
| `POST <your route>` (no credentials) | **401 / 403 + your own JSON** | The check runs first, and it is your handler answering |
| `POST <a path that does not exist>` (no credentials) | 405 or the static layer | That is the SPA fallback, not your handler |
| `GET /` (no credentials) | 401 | Unauthenticated index requests must also pass `authorizeIndex` |

> 📖 Equivalent hook: `connection.admit({ headers })` → `{ peer }` or `{ rejection }`.
> To only decide one rejection, `requestRejection` is enough; use `admit` when the route must act as the operator identity.

**A route has only two kinds** (✅ source of `webServer.register`: `route.kind === "exact"` goes into the exact table, **every other value goes into the prefix table**,
so `kind` has exactly two tiers — exact and prefix; registering the same `kind` + `path` twice throws `duplicate … route`).

### 4.5 Notifying the UI: the allowlist and "can use ≠ can add"

- **Not every host event reaches the browser**: the forwarding list is **hardcoded** in `dsh-api-remotes` (`API_REMOTE_FORWARDED_EVENTS`). A client subscribes to **listed** events with `ctx.remote.$on('<name>', …)`; **a plugin cannot add its own event**.
- ⚠️ The reverse is commonly misread: **"cannot add a Remote namespace" ≠ "cannot use Remote"**. **Existing** namespaces are usable as usual (the client half may call them). Only **plugin-private** write operations need a self-built authenticated route.
- ⚠️ **Desktop users cannot see `logger`.** Wherever "a failure must be known", fold the outcome into **the report returned to the caller** (both the UI and the tool path can read it) instead of only `logger.warn`.

### 4.6 Small things that were checked

- `ctx.emit('some/event', …)` is built into cordis and needs no extra declaration
- `ctx.logger` needs no inject
- After reading an HTTP body you must handle the JSON parse error yourself
- ⚠️ A service you registered yourself **does not** show up in `Service.listService` (it only lists catalogued services with descriptions) — invisible ≠ unregistered

### 4.7 🔴 Mutating the host's own state: order + broadcast + partial failure

This section is about **destructive operations** (deleting data, changing ownership, touching someone else's accounting). It is where things go wrong most easily, and the failures are often silent.
Three of the four kinds of operation touch the host's own state: **deleting a record**, **removing it from a group**, **changing who owns it**.

**① Order: flush first, then delete, then verify, and only then touch accounting.**

```
flush (write committed events through to persistence)
  → delete the files (every id spelling)
  → verify they are really gone (a dispose race can re-create them: yield a turn, sweep again, abort if anything survives)
  → only now release the accounting (group membership, archive/pin sets, derived caches)
```

There is exactly one reason: **a half-deleted record is worse than an undeleted one**. Files gone but accounting kept → the UI shows a broken row that cannot be opened;
accounting released but files still there → it falls into "Ungrouped" and the user thinks the wrong thing was deleted. So **accounting is always touched last**.

> The matching mechanism: **the persistence seam has no deletion API** ("Nothing deletes session files"),
> so this kind of operation must delete files itself and maintain the derived state itself — which also means **the order and the broadcast are your responsibility**.

**② Broadcast: after deleting the host's own state, the UI will not find out by itself.**

The host emits an event when **it** does this; you must emit **the same** event when you do:

```
host: ctx.on('session/disposed', s => ctx.emit('api-session/removed', s.id))
you : ctx.emit('api-session/removed', id)        // ← deleting files does not dispose a session, so you must emit it yourself
```

Not emitting produces the textbook **"the files are gone but the row is still there"**: the client list only re-reads on a rebuilt connection,
and even a re-read preserves unchanged rows — a removed row can only leave through an **explicit notification**.

**How**: first find where the host **itself** emits that event (extract the package and search the event name), and emit it the same way. Emit **only after the operation really succeeded**
(never on a failure path, or the row would vanish for no reason).

**③ Prefer a public API over writing shared tables directly.**

Some host state has **public methods** that maintain their own caches and timestamps; writing the underlying table bypasses that:

| With a public API | Without one |
|---|---|
| Use `ctx.<service>.<method>()` (e.g. `unarchiveSession` / `unpinSession` for archive/pin) | You can only write the live table (e.g. removing an id from a group's members), and you must **comment why** |

**What "live table" means**: the authoritative in-memory state. Changing only the on-disk JSON gets overwritten by the next periodic flush —
so **change the in-memory state, do not merely delete files**.

**④ Partial failures must reach "the report returned to the caller".**

A cleanup has seven or eight steps and any of them can fail. **Do not let each one `logger.warn` and stop there** (§4.5: the desktop UI shows no logs).
The correct shape: collect them into a `degraded[]` and **return it alongside the successful result**, so both the UI and the tool path can see it:

```js
return { ok: true, removed: [...], degraded: [{ step: 'workspace-membership', detail: '…' }] }
// and say it in the report: INCOMPLETE: the log is gone, but these accounting records may still name it
```

**⑤ Refuse to consume yourself** (§5.5): when an operation would destroy "the carrier the caller itself depends on", refuse explicitly and give an alternative entry point.

**Two real counter-examples (both observed at runtime)**

| Symptom | Root cause | Conclusion |
|---|---|---|
| After deleting, the sidebar row is still there until restart | The host's own event was never broadcast | See ② |
| After adding a "full list refetch", the deleted row renders as "Ungrouped" | A **second writer** was introduced | See §11 |

---

## 5. Tools (letting the model call things)

### 5.1 Two styles

**Style A — `defineTool` (needs an import; only suitable for composition packages resolved from the installation directory)**

```js
import { defineTool } from '@deepseek-ai/dsh-tools'

ctx.tools.register(defineTool({
  name: 'my_tool',
  description: 'One sentence saying what it does.',
  parameters: { path: { type: 'string', required: true, description: '...' } }, // flat table
  output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
  async execute(args, exec) { return '...' },
}))
```

`defineTool` compiles the flat table into JSON Schema **and wraps argument validation into `execute`** (a violation throws `ToolArgsError`).

**Style B — register a `ToolDefinition` directly (recommended for profile plugins; zero imports)**

```js
ctx.effect(() => ctx.tools.register({
  name: 'my_tool',
  description: 'One sentence saying what it does.',
  parameters: {
    type: 'object',
    additionalProperties: false,                    // makes "what the model wrote == what the log holds"
    properties: { path: { type: 'string', description: '...' } },
    required: ['path'],
  },
  output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
  async execute(args, exec) { /* ← you must read args defensively */ },
}), 'my-plugin: tool')
```

| | Style A | Style B |
|---|---|---|
| import | `@deepseek-ai/dsh-tools` | none |
| `parameters` | flat table (`required: true` inside the field) | JSON Schema (`required: [...]` is an array) |
| **argument validation** | ✅ the registry validates for you | ❌ **it does not** (see §5.2) |

**Do not mix the two**: mixing does not error, but it validates a chimera.

#### Style A's flat-table DSL: the vocabulary

✅ **At the time (`0.2.0-rc.2`)** read line by line from the `dsh-tools` schema compiler. The parameter table is a map of "**property name → value schema**",
where a value schema is tiered by `type` and **the allowed keys per tier are closed** (one extra key throws
`… is not supported by the value schema DSL`).

> To re-check after an upgrade: extract that version's `dsh-tools` and read the compiler in `lib/index.js`
> (search for `is not supported by the value schema DSL` and `ANNOTATION_KEYS`).
> **The compiler's own error text documents the vocabulary**; reading it beats reading type aliases.

```js
parameters: {
  path:   { type: 'string', required: true, description: '...' },  // required lives inside the field
  limit:  { type: 'number', description: '...' },
  mode:   { type: 'string', enum: ['fast', 'safe'] },
  tags:   { type: 'array', items: { type: 'string' } },
  opts:   { type: 'object', additionalProperties: false, properties: { deep: { type: 'boolean' } } },
  either: { oneOf: [{ type: 'string' }, { type: 'number' }] },
}
```

| `type` | Extra keys allowed in that tier |
|---|---|
| `string` / `number` / `integer` / `boolean` / `null` | `enum` (a non-empty array of scalars), `const` |
| `array` | `items` (one value schema) |
| `object` | `properties`, `additionalProperties` (**must be written explicitly as `true`/`false`**) |
| `json` | none (compiles to an "annotation-only" schema = any JSON) |
| `oneOf` instead of `type` | `oneOf` (an array of **at least two** value schemas) |

**Every tier also allows these four annotation keys**: `description` / `title` / `default` / `examples`.

Four hard limits (violating them throws `JsonSchemaError`):

1. `type` and `oneOf` **cannot** be declared together;
2. With `oneOf` you **cannot** carry `properties` / `required` / `additionalProperties` / `items` / `enum` / `const`
   (it reports `is not supported beside oneOf`);
3. `required` may only appear on a **property node**, and only as **`true`** (`required: false` throws too);
4. `type: 'object'` must state `additionalProperties` explicitly; `enum` must be a non-empty scalar array; the structure cannot be cyclic.

> ⚠️ This vocabulary **only applies to style A**: `defineTool` compiles it and validates arguments.
> **When style B writes JSON Schema by hand there is no validation at all** (§5.2) — those constraints become "things you must guarantee yourself".

### 5.2 🔴 The truth about argument validation (✅ measured + source)

**With style B the registry does not validate arguments against your schema; values of the wrong type go straight into `execute`.**

- Source: `validate = (args) => validateJsonSchemaValue(parameters, args, '')` **appears only inside `defineTool`**;
  the main dispatch path never calls it (`validateJsonSchemaValue` is called in this package only from `defineTool`'s closure and from output validation).
- Measured: a tool declared `sessionId: { type: 'string' }`, called with `{"sessionId": 12345}` —
  **no** `INVALID_ARGS`, **no** `invalid arguments:`; the call ran as usual and the tool's own guard finally returned
  `delete failed: a session title or id is required`.

**Conclusion (the style B checklist)**:

1. At the top of `execute`, **check the argument shapes yourself**: `typeof args?.x === 'string'`, `Array.isArray(...)`, length limits;
2. When an argument is **unusable**, **throw** (or return an explicit failure text) instead of letting it continue into the business logic;
3. To get validation for free, use style A — but that requires `@deepseek-ai/dsh-tools` to be resolvable (§9.1).

### 5.3 The expressiveness ceiling

(The full vocabulary is at the end of §5.1; here we only cover what **cannot** be expressed.)

**Cross-field constraints ("at least one of `a` and `b`") cannot be expressed**: there is no `anyOf` / `allOf`,
`oneOf` and `properties` are mutually exclusive, and `parameters` must have `properties` — so `oneOf` can only be used on
**a single property's value** (e.g. "this field is a string or a number"), never to express a relation between fields.

Style A has one more limit: a `oneOf` branch **cannot** declare structural keywords beyond `type` (§5.1 hard limit 2).

**Do not force a schema** — let it fail loudly **at runtime** (§5.4) and put the constraint in the `description`.
Example: write "at least one of `sessionId` or `title` is required" in the description, then check it at the top of `execute` and return an explicit error.

### 5.4 Result shapes carry meaning

📖 Documentation: model arguments are validated before execution; **invalid input becomes an ordinary error result**; cancellation is cooperative and waits for full quiescence,
and **cancellation after the body ran can only replace a successful result with `ABORTED`**.

| Situation | The right shape | Why |
|---|---|---|
| Unusable call arguments (empty, wrong type, no unique target) | **throw → an error result** | Same class as a schema validation failure; returning success-shaped text makes the model **think the call completed** |
| Execution-time exception (storage unavailable, …) | **throw → an error result** | Otherwise "execution failed" and "you called it wrong" are indistinguishable to the model |
| A **legal** request that execution refuses (policy / safety guard) | Return **text plus an alternative entry point** | The caller wants a reason and a next step, not an error marker |
| Correctly shaped request that fails after running | Return a **text report** | The documentation only defines **schema-level** invalid input as an error result |
| The call was cancelled | **Do nothing** | The framework replaces a successful result with `ABORTED`; returning "cancelled" yourself **misreports** |

**The key structure**: put "resolution phase" and "execution phase" in **two separate try blocks** — a resolution problem is an error visible to the caller,
while an execution failure still returns its own report. (If a resolution call sits outside the execution `try` and has none of its own, a storage-layer exception escapes directly
and becomes indistinguishable in shape from "you called it wrong".)

**Do not forward `exec.signal` into an irreversible operation** (the operation may **already have committed**, and forwarding cancellation makes the caller believe it did not).
Read-only, reentrant queries may forward it.

> ✅ **A real example demonstrating all three classes** (a session-delete tool): empty arguments → `throw`; id does not exist → a **text report**;
> being asked to delete **the very session this call is running in** → a **text refusal + alternative entry point**.
> The last class matters most: it is neither an argument error (the id is legal) nor an execution failure (nothing ran yet),
> and expressing it as an error result makes the model think it mistyped an argument and retry forever.

### 5.5 One operation, several callers

The specification requires **one implementation per operation**. "One" means **one implementation**, not "one entry point": the UI action, the agent tool,
and (when needed) the HTTP route **all call the same core function**.

The core function **does not have to be** a Service class. For a profile plugin, use a module-level `async function doThing(ctx, args, opts)` —
it needs no `import` of `@deepseek-ai/cordis` (§9.1) and is naturally reused by several entry points.

> ⚠️ **An operation that cannot consume itself must refuse explicitly.** If the operation would destroy the carrier the caller itself lives on
> (for example deleting "the session this tool call is running in"), the core implementation needs an explicit refusal that tells the caller the **alternative entry point**.
> This is not a style question: the tool result must be written into that very log, and that log is being deleted — letting it fail loudly at runtime
> beats a result that looks successful while the data is inconsistent.
> To get "the current caller": `ctx.get('agents')?.currentInitiator()` (✅ this machine's service signature).

---

## 6. Manifest, patch, install, generations, uninstall

### 6.1 Manifest field traps

| Field | Note / trap |
|---|---|
| `name` | **The directory name can be anything; the package name is the identity.** Renaming it = a different package (§6.5) |
| `version` | The same version as an installed package of the same name makes the two indistinguishable |
| `type` | Must be `"module"` |
| `main` | Write it even when it is not in `files` (`files` only affects packaging/publishing) |
| `exports` | Host `"."`; Client `"./client"`; metadata `"./package.json"`; copy `"./locale/*.json"` |
| `icon` | Relative to the manifest directory; SVG/PNG/JPEG/WebP, ≤256 KiB; absolute paths, URLs, paths outside the directory and escaping symlinks are rejected |
| `meta` | `package.json` top level: inline display text, **flat** (`{ "title": …, "description": … }`) |
| `locale/<lang>.json` | Per-language display text, **nested** (`{ "meta": { "title": …, "description": … } }`). ⚠️ **A flat shape is silently ignored** → see the shape snapshot [`版本快照/0.2.0-rc.2/展示元信息-形状.md`](版本快照/0.2.0-rc.2/display-metadata-shape.en.md) |
| `dsh.bundle.patch` | The patch path; an ordered list is also accepted, **applied in order within one layer**, and a relative plugin path inside each file **resolves relative to that file itself** |
| `dsh.client.platform` | **Required**, and must be a string (✅ source `parseDshClient`: a non-string throws); currently only `"web"` |
| `dsh.client.immediately` | Optional **boolean** (any other value throws; default is not immediate) |
| `dsh.client.inject` / `external` | Optional **string arrays** (a non-string member throws). Only for activation ordering / modules outside the platform seed table |
| `peerDependencies` | **Optional** (§9.3): declaring it only enables the version compatibility gate, and a wrong range gets the whole package skipped |

> 📖 Display metadata (`icon` + `meta` / `locale/*.json`) is readable **without activating the plugin**;
> missing fields fall back to `name` / `description` and the panel's default artwork. It is a different thing from **runtime copy** (Client locale, §7.4).

### 6.2 The Loader patch dialect

A patch is a **top-level YAML array**:

```yaml
- insert:                      # append rows
    - id: my-plugin
      name: "@local/my-plugin"
      config: { ... }          # optional
- id: some-existing-row        # override: the supplied fields replace that row's fields
  config: { ... }              # ⚠️ config is replaced wholesale, not deep-merged → restate every key
```

| Form | Semantics |
|---|---|
| `- insert: [rows]` | Append; when `insert` carries an `id` naming an existing `group: true` row, the rows are appended inside that group's `config` list |
| `- id: <existing row>` + other fields | Override that row |
| A truthy `id` + `name` | **Asserts** the existing plugin name rather than renaming it |
| No `insert` and an empty / unmatched `id` | Warns and skips |

Row fields: `id`, `name`, optional `config`, plus `disabled`, `inject`, `intercept`, `isolate`.

- **group**: `group: true` + `name: cordis:group` makes `config` a nested row list; `cordis:include` reads a row list from `config.path`.
- **disabled**: a boolean, `null`, or a `!!js` expression (**evaluated at every mount decision**).
- **`!!js`**: write `!!js`, **not** `!js`; inside `config` it is evaluated **after** the injections that row declares are active, against that plugin's context (`ctx.<service>` is available); other row metadata stays literal.
- **isolate**: service name → `true` / realm label. **A preset plugin that provides a Service must isolate the provider and all consumers into the same realm.**

**Composition layering (later layers win)**: the profile's `dsh.profile.bundles` list → the profile's own `cordis.patch.yml`
→ `$DSH_HOME/cordis.patch.yml` → each `--patch` overlay.

**Two consequences**: your patch can override an earlier row by id, but **must restate every key**;
**the user can always override your row in their own profile patch** → provide defaults the user is likely to keep.

> ⚠️ **When removing a plugin, also remove the overrides pointing at it**: leaving `- id: <deleted plugin's row>` in a patch becomes an "unmatched row" warning.

### 6.3 Module generations: why "my change did nothing"

**Within one process a module is evaluated only once** (Node's ESM cache is keyed by the resolved URL).

| What you did | When it takes effect |
|---|---|
| Newly installed a bundle | May take effect **immediately** through hot loading |
| **Replaced** the code of an installed package | **No** new generation automatically |
| **Toggled the plugin switch** (`set_bundle`) | **Does not** reload the module (but revokes that fiber's registrations) |
| Edited files in place and reinstalled | Usually **no** new generation |
| ✅ **Put the source directory into `hmr`'s `config.root`** | Editing a file triggers a hot reload, **no restart** |
| ⚠️ Changed the path (renamed the directory) and reinstalled | Does produce a new generation, but **the old generation is not unloaded** — do not use this |

**The right way: let HMR watch your source directory** (in the profile's `cordis.patch.yml`):

```yaml
- id: hmr
  config:
    root:
      - F:/path/to/my-plugin/src     # watch only the source directory, not a whole drive
```

✅ Measured: a package whose first install failed **activated successfully after one file edit** once `hmr.root` was in place, with no restart at any point.

> ⚠️ **Why not "change the path"**: the old fiber is not unloaded → the HTTP routes registered by the old generation **keep answering**
> (so "the route still responds" does not prove the new code loaded); if the new generation registers **the same path**, webserver throws
> `duplicate exact route`, leaving you a **half-new, half-old** runtime. If you must change generations without HMR: **restart properly**.

**With `hmr.root` in place, BOTH halves reload** — not just the Host half:

| Half | Who is watching | The reload path |
|---|---|---|
| **Host** | HMR's file watcher | Clear the ESM/CJS module caches → re-import → the old fiber unloads, the new generation mounts |
| **Client** | The same file watcher | The client-module registry notices the file's mtime/ctime/size changed, decides on a new revision, and pushes an SSE `{"type":"rebuilt", id, rev}` frame through `ctx.clientModules.onRebuilt`; the module controller in the browser swaps that revision in and re-renders |

So **editing `client.js` often needs no manual refresh either**.

> ⚠️ **When a change does not show up, refresh once before concluding anything — that step rules out timing, it does not swap code.**
> The frame may already have rendered while your change lands in the next one, and the SSE frame and the browser's swap can be a beat apart.
> So the criterion splits in two:
>
> - **Behaviour changed after the refresh** → the new code **was already live**; you simply looked too early (a timing artifact);
> - **Still the old behaviour after the refresh** → this generation **never swapped in**: no `hmr.root`, the edited file is outside the watched directory,
>   or the Host half failed to load (see §9.2 for the diagnostics).
>
> **Order of investigation: refresh first to rule out timing, then check the generation.**

### 6.4 Update / uninstall / reinstall (✅ fully measured)

| Intent | How | Trap |
|---|---|---|
| Make a code change take effect | `hmr.root` or restart the profile | An in-place reinstall does not change the generation |
| **Change version / directory** | **`remove_bundle` first, then `install_bundle`** | Installing directly while installed → `ambiguous-install` |
| Temporarily disable | `set_bundle { enabled: false }` | Disabling does not unload the module, but revokes registrations |

> ⚠️ **What `ambiguous-install` is**: the installer infers which package was just installed from the **before/after difference in `package.json` dependencies**;
> when the target is already installed and the dependencies did not change, the difference is empty, and the fallback name match does not work for a `file:` path → it reports this.
> **It is not a failure, it is "there is no change to commit".**

**Uninstall** ✅ measured: `remove_bundle` returns `application: "applied"` with no warnings;
the profile `package.json`'s `dsh.profile.bundles` and `dependencies` both lose the entry, and
`pnpm-lock.yaml` and `node_modules/.modules.yaml` are cleaned as well;
afterwards `Config.listConfigs { name }` returns an **empty directory** (= the row really left the Loader tree).

> ⚠️ On Windows the `node_modules/<scope>/<name>` **junction may remain** (pnpm's cleanup behaviour):
> it does not affect reinstalling (the manifest and lockfile are consistent), it is a pure junk directory, and you can delete it by hand for cleanliness.

**Reinstall** uses **the same** `install_bundle` command ✅ (the row id is unchanged; the slots and tools come back).

> ⚠️ **Permissions**: every `plugin_manager` operation (**including `list_plugins` / `list_bundles`**) requires
> `danger-full-access` or approval for that call; `never`, a refusal, a cancellation, or an unavailable approval channel all mean **it does not run**.
> Approval **does not change** the session's permission mode. **Installed Host code runs inside the host process and is not limited by the workspace sandbox.**

### 6.5 The cost of renaming

**Renaming the package = a different package.** Three places must move together: `package.json`'s `name`, `client.js`'s
`__ModuleLoader__.load({ id })` (**must equal the package name**), and the profile's `dependencies` and `dsh.profile.bundles`.

### 6.6 The CLI's path-splitting trap

`dsh plugin --profile <p> add …` **forwards its arguments verbatim to pnpm**; with spaces in the path, an unquoted `file:` is split
(`ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER`). **Workarounds**: quote the whole argument, **or use `plugin_manager` directly**
(its target travels as a JSON string and never goes through shell splitting). Paths containing Chinese characters or spaces especially should go through `plugin_manager`.

### 6.7 Build-script approval (pnpm ≥10)

When a package has install scripts (`prepare` / `postinstall`), pnpm intercepts and demands explicit approval; a failing install returns
`pendingBuilds`. The Web plugin page offers "allow and retry"; `install_bundle`'s `approvedBuilds`
**may only be passed after that user explicitly approved those scripts** (the service only checks names, it does **not** verify the conversation history).

> ⚠️ Treat that approval as "**allow this package's code to execute at install time with the host user's privileges, outside any sandbox**".
> Only approve packages of trustworthy origin, and pin the commit (`github:you/pkg#<sha>`).

---

## 7. The Client (UI) half

### 7.1 Module format

```js
window.__ModuleLoader__.load({
  id: "@local/my-plugin",   // ← must === package.json's name
  factory(require) {
    const React = require("react")
    // ...
    return { inject: ["slots", "locale"], apply }
  },
})
```

- The factory **must have no side effects**; styles, timers and listeners are all registered inside `apply` with `ctx.effect` / `ctx.on` and return their cleanup.
- Components are **module-level** React components using `React.createElement` (there is no JSX transform).
- Modules outside the table are declared with `dsh.client.external`.

### 7.2 The platform seed table and the three lanes

**Rules first, then how to query the values.**

The browser's `require` resolves only against a **platform seed table** (a module table the shell freezes at startup). Before writing you must find out two things:
which lane your Client half belongs to, and which modules that lane can reach on this version.

| lane | Who | What it may require |
|---|---|---|
| **Dynamic module package** (what this guide teaches: `__ModuleLoader__.load` + `dsh.client`) | your hand-written `client.js` | modules in the platform seed table (✅ on this version that includes `ui-primitives` — it is this lane's **implicit external**, and need not be listed in `dsh.client.external`) |
| **Compiled, published Client package** (DSH's own `.tsx` packages) | packages in a source checkout | ❌ no Harness Client package: **copy the control markup and CSS yourself**, using only `--dsw-alias-*` |
| **`cordis-client-runner` closure** | UI an agent writes dynamically | ❌ import nothing: only the injected `ctx` / `React` / `styles` / `host` (`Builtin.listBuiltins` lists them all) |

> 📖 Source: the bundled `ui-workspace` documentation states that a dynamic Module Loader package **treats `ui-primitives` as an implicit baseline external**
> ("A Module Loader package (`factory(require)`…) gets `@deepseek-ai/dsh-client-ui-primitives`
> as an implicit baseline external"), and its own dynamic rows require `MenuItemButton` and friends.

#### How to query this table (do not copy it; it expires)

**This document does not list the table's members**, because they change with the version and hardcoding them only misleads. Use §9.5's probe to extract the frontend artifact, then:

```sh
# The seed table is an id → module object literal in the main frontend bundle
grep -o 'react-dom/client[^}]*}' <extracted dist>/assets/index-*.js | head -c 1200
```

The members read at the time (`0.2.0-rc.2`) → [`版本快照/0.2.0-rc.2/种子表.md`](版本快照/0.2.0-rc.2/seed-table.en.md).
**Trust what you read yourself**, especially newly added `dsh-client-*` members.

> An equivalent criterion: `Builtin.listBuiltins` lists what the **runner closure** can reach
> (`ctx` / `React` / `host` / `styles` / `console`) — that is the third lane's vocabulary; do not mix them up.

**Two rules that do not change with the version:**

- **Always check that an export really exists before destructuring.** ✅ A real case: an implementation destructured `IconTrashOutline16`
  from `ui-primitives`, but that version only exported `IconTrashOutline` / `…Regular` / `…Medium` / `…Artwork` — zero hits →
  `require` succeeded but returned `undefined` → `React.createElement(undefined, …)` threw → **the whole slot went blank**.
  The essence of the rule is "**check that the export exists**", not "do not require".
- **Do not portal to `document.body` yourself.** `react-dom` is genuinely in the table and it is mechanically possible, but the host's own Modal
  already renders in that modal layer; portalling again bypasses the host's Escape / focus return / stacking. **For a floating surface use the `shell.overlay` slot.**

### 7.3 Other hard requirements

- Use only the **`--dsw-alias-*`** tokens `Theme.listTokens` lists (plus `--dsw-specific-*`); **literal colors are for artwork only**.
- Copy spacing, font sizes and row patterns from a host page of the same kind; **the reference for management lists is the Plugin Manager page**.
- **Do not** replace the app root, **do not** append a second application to `document.body`, **do not** write DOM outside your components.
- **Do not** read another plugin's DOM / stylesheet / component source to estimate placement — pick a slot that **already allocates space**.
- **Do not** carry a Host-provided page in an iframe (an iframe gets no theme tokens, no light/dark switching, and no `ctx.locale`).
- The Client **must not** fold session events itself; when it needs a session-derived value, declare it on a Host projection and send it pre-computed.

### 7.4 Copy: `locale: NS` only points the way, and the seat must not be trusted blindly

`locale: NS` on a slot registration row **only injects the `t` seat; it does not install dictionaries**. You must register them yourself:

```js
ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'my-plugin: dictionaries')
```

**The symptom of not registering**: the UI shows **raw keys** (`menu.delete`, `dialog.title`, …) — `t` exists but finds nothing, so it falls back to the key.

**But "registering means no raw keys" is wrong.** Two mechanisms you must know:

1. **`translate(ns, key)`'s fallback when it finds nothing is `?? key`** — while that namespace **has no dictionary yet**,
   it **returns the key itself**, without throwing and without returning an empty string. So "having `t`" and "having copy" are two different things.
2. **Rendering can happen before registration.** Dictionary registration lives in `ctx.effect`, while a component may already have rendered;
   if you hang the registration on a `ctx.get('locale')` branch (the service is not active yet → you do not register),
   the window is even longer. **The symptom is highly misleading: the first open after start-up shows raw keys, and reloading the plugin once fixes it.**

**What to do (use all three together):**

```js
// ① The seat only wins when it really translated something; otherwise fall back to the built-in dictionary
function resolveText(seat, key, values) {
  if (typeof seat === 'function') {
    try {
      const text = seat(key, values)
      if (typeof text === 'string' && text !== '' && text !== key) return text   // ← the key check
    } catch { /* a broken seat must not blank the copy */ }
  }
  return builtinText(key, values)          // the built-in zh/en dictionary (also the fallback when there is no locale service)
}

// ② Declare locale: NS unconditionally — the component has its own fallback, so a present or absent seat is both safe
ctx.slots.register({ name: SLOT, id: 'myRow', locale: NS }, MyComponent)

// ③ Wait for the service with ctx.inject (§8.1); once the dictionary lands, let already-rendered components re-read the copy
ctx.inject(['locale'], (sub) => {
  ctx.effect(() => {
    const disposer = sub.locale.register(NS, { zh, en })
    touchSubscribers()                     // e.g. re-publish module-level state so subscribers re-render
    return disposer
  }, 'my-plugin: dictionaries')
})
```

- Declare `locale` in `inject` (**a hard dependency is simplest**: `return { inject: ['slots', 'locale'], apply }`) —
  then `ctx.locale` is guaranteed, and steps ① and ③ are still needed because they guard **the window before registration completes**.
- To keep the plugin loadable in a composition without a locale service, treat it as a **soft dependency** (only `ctx.inject`);
  **but do not** write a "`ctx.get` fast path + `ctx.inject` fallback" pair (§1: the effects attach to different contexts).
- The built-in dictionary is not "bypassing the locale service": it is the fallback the official documentation states, and it now also covers **the registration window**.
- A debugging criterion: `grep 'translate(ns, key' <that version's frontend bundle>`; seeing `?? key` means this mechanism is still there.

### 7.5 Slot registration

```js
ctx.slots.inject(SLOT, function* () {
  yield ctx.slots.register({ name: SLOT, id: 'myRow', order: 500, locale: NS }, MyComponent)
})
```

- `ctx.slots.inject(key, cb)` **must be used**: it waits for the declaration, removes your entry when the declaration collapses, and re-registers it on restoration.
  The callback may return one disposer or several iterable ones (a generator works).
- The registration object needs **`id`** (required); `order` / `label` are optional. **Do not** guess `key` / `priority`.
- **The props a component receives are decided by the slot's own standard props + `ownerProps` + `hookContext`, and must be queried, never inferred**:

```
Slots.listSubTree { root: "<slot name>" }
```

Look at `catalog.standardProps` (framework-injected, such as `useSessions` / `sessionId`),
`catalog.ownerProps` (what the owner passes), `catalog.hookContext` (which hook is injected), and
`catalog.slotInject` (the hook sources the owner declared).

**The shape of ownerProps**: in what `Slots` returns, owner props are an **interface source string**.
It is version data — the snapshot is [`版本快照/0.2.0-rc.2/槽位-ownerProps.md`](版本快照/0.2.0-rc.2/slot-owner-props.en.md);
**copy the field names from the declaration you query yourself**, never invent names and never copy the snapshot's.

**Three ways to get a value into a component:**

| Way | What the component sees |
|---|---|
| Standard props | nothing to do; the framework injects them → `props.sessionId`, `props.useSessions(selector)` |
| Your own observable hook | `inject: () => ({ hooks: { myState } })` where `myState` has `getSnapshot` + `subscribe` → `props.useMyState(selector)` |
| The owner's hook factory | `inject: (standard, hookContext) => ({ hooks: { menuOpenState: () => hookContext } })` → `props.useMenuOpenState()` |

> ⚠️ **Inside a slot, "registered" ≠ "the user can see it"**: registering into a slot that **does not exist in the current composition** gives no warning at all
> — confirm with `listSubTree`'s `occupants`, then refresh the page and look.

---

## 8. The Host half: services, projections, events

This section expands §4.1, organised by "what you intend to do".

### 8.1 Three ways to get a service

| Situation | Use |
|---|---|
| Hard dependency (should not start without it) | `export const inject = ['tools']` → `ctx.tools` |
| Soft dependency (do it when present) | `ctx.inject(['webServer'], (sub) => ...)` |
| **Re-resolve on every request / call** | `ctx.get(name)` (because it must tolerate a service that mounts late) |

The `access.optional` / `access.hardDependency` fields that `Service.listService { service }` returns are each service's official guidance.

### 8.2 Projections: the proper way to derive session state

```js
ctx.sessionProjections.register({
  key: 'myState',
  stateSchema,                        // plain JSON
  init: () => ({ ... }),
  apply: (state, event) => (state for ignored events, returned as the same reference),
  wire: { viewSchema, view: (state) => ... },   // declare it when the Client needs the value
  stateVersion: 1,                    // +1 when fields or fold semantics change
})
```

- `apply` must be **pure and synchronous**, and it must **return the same reference** for events it ignores (otherwise everything downstream wakes up and every cache invalidates).
- When the Client needs the value: declare `wire.view` and compute it on the Host (the Client **must not** fold events itself).
- The projection cache checkpoints accordingly: a cold read replays only the tail, and a stale checkpoint is discarded when `stateVersion` changes.

### 8.3 The boundary between events and the log

- **Do not** append session events with a new `type`: a reader only accepts a stored event of unknown type when its envelope carries `ignorable: true`,
  and a live `Session.append()` **cannot set that marker**, so the session would refuse to reopen.
  Derive state from existing events, or keep plugin-owned data in a storage service found through inspection.
- Observe final outcomes on `tools/result`; rewrite a result only in `tools/post-execute`.
- A waterfall that does not own the decision **must `return next()`**.

### 8.4 Timers and wake-ups

- A timer that starts work → `agent.followup()` (**wakes**); adding only context → `agent.inject()` (**does not wake**, and may wait forever).
- Clear a timer in the effect that owns it.
- Do not poll `agent/status`; wait on durable events.

---

## 9. Versions, resolution paths, config shapes

### 9.1 Whether you can import `@deepseek-ai/*` (conclusion + mechanism)

**Recommended style: zero `@deepseek-ai/*` imports in a plugin, only `node:` builtins, with every service taken from `ctx`.**
But the reason is **not "an import always fails"** — it is the **resolution path**:

| How your package got installed | Where a bare name resolves from | Can it import |
|---|---|---|
| `plugin_manager install_bundle` (`file:` / a local directory, i.e. the profile's `node_modules/<name>` points at your directory) | Upward from **your directory's real path** — which only has the profile's own packages | ❌ `ERR_MODULE_NOT_FOUND` |
| Same, but you **declare that package as a dependency** so pnpm installs it into the profile | The profile's `node_modules` has it | ✅ |
| A composition package shipped with dsh (resolved from the installation directory) | From the installation directory | ✅ |

> **The mechanism**: `install_bundle` links the package into the profile's `node_modules` with `link:`. When Node resolves a bare name it
> **first resolves the symlink's real path**, then searches the **ancestor directories of that real path** for `node_modules` — and the two do not line up, so it fails.
> In other words: **whether an import works depends on whether the package is on the resolution path, not on whether it is `@deepseek-ai/*`.**

✅ A measured comparison (the same package, not one character changed except one thing):

| Form | Result |
|---|---|
| Zero `@deepseek-ai/*` imports | ✅ `application: "applied"`, `warnings: []` |
| Only removing `import { defineTool } from '@deepseek-ai/dsh-tools'` | ✅ activated successfully immediately |
| Keeping a **hand-written `Config` export** (a legal Standard Schema, but not native schemastery) | ❌ activation failed: `TypeError: Cannot read properties of undefined (reading 'validate')` |
| Uninstall, then `install_bundle` again | ✅ `application: "applied"`, `warnings: []` |

**Three replacements for zero imports**:

| Instead of | Use |
|---|---|
| `import { Service } from '@deepseek-ai/cordis'` | `ctx.provide(...)` when you must expose a service, or attach methods to an object you registered in `apply` |
| `import { defineTool } from '@deepseek-ai/dsh-tools'` | register a `ToolDefinition` directly, with protocol-level JSON Schema in `parameters` (§5.1 style B, **and validate the arguments yourself**) |
| `import Schema from '@deepseek-ai/schemastery'` | **do not export `Config`** (§9.4) |

> ⚠️ Do **not** write an import "in case it is needed later"; when you really need a package, install it as a profile dependency first.
> ⚠️ Do **not** copy the online troubleshooting advice to "look for symlinks in `%DSH_HOME%\profiles\node_modules`":
> that directory **does not exist** on this version (✅ measured), and the related fallback function has been removed from the code. This resolution is entirely **in-process**.

### 9.2 Diagnostic entry points

**Four things, in order:**

1. **The install result's `application` / `warnings`** — the only place that decides "did this take effect".
   | `application` | Meaning |
   |---|---|
   | `applied` | In effect (possibly through hot loading) |
   | `failed` | Needs diagnosis |
   | `overridden` | A higher-priority layer won |
   | `restart-required` | **Not in effect** |
2. **The install result's `diagnostic`** (with a stack) — the most attributable error entry point.
3. **`Config.listConfigs { name }`'s `status`** (the table in §9.4) — separates "module loaded" from "activated".
4. **`Slots.listSubTree`'s `occupants`** — whether the UI registration really entered the tree.

> **The raw output** (what those strings look like on this version, and the full `status` value table) →
> [`版本快照/0.2.0-rc.2/诊断文案.md`](版本快照/0.2.0-rc.2/diagnostic-text.en.md).
> The strings change; **the criteria do not**: the table below is what to remember.

**`failed to import` is a fallback string with no cause** (📖 source: it is hardcoded when `entry.fiber === undefined`;
the real error is thrown in `cordis-plugin-loader`'s catch and then dropped after `logger.error(error)`):

| Your plugin | What the diagnostic looks like |
|---|---|
| Module **resolution** failed (threw during `_init`) | `failed to import`, **no stack** |
| The module loaded but `apply()` or `Config` validation threw | **A real error with a full stack** |

> ⚠️ **The desktop UI shows no `logger` output** (✅ on this machine `%APPDATA%\@deepseek-ai\dsh-desktop\logs` exists but holds **0 files**),
> so item 2 (the returned `diagnostic`) is far more reliable than digging through logs.
> Wherever "a failure must be known", fold the outcome into **the report returned to the caller** (§4.5).
> When you see `failed to import` and you use the zero-import style, suspect **top-level code** and the **`Config` shape** first, not imports.

### 9.3 The version compatibility gate (only active when a peer is declared)

- Before importing a plugin, a profile checks the `peerDependencies` declarations against `@deepseek-ai/dsh` and `@deepseek-ai/dsh-*`:
  every declared range must match (**prerelease versions participate in matching**); `workspace:*` means the same runtime;
  **declaring no DSH peer imposes no constraint at all** (= zero upgrade warnings); the basis is the **peer declaration**, not `engines.dsh`.
- A rejected plugin **never imports its module**: an ordinary row becomes a detached `disabled: true` row, and a composition package goes into `skippedBundles`.

**The trade-off:**

| Choice | You gain | You lose |
|---|---|---|
| **Do not declare** (recommended, especially with zero imports) | Never blocked by the compatibility gate | No upgrade warnings |
| **Declare and pin the exact version** | The only reliable source of upgrade warnings | A wrong range → **the whole package is skipped** |

**Always re-check the range before copying someone else's manifest.** A range written for **a previous prerelease generation** (`^0.x.0-rc.N` and the like)
**does not match** the current one → the whole bundle is skipped. If a snapshot preserves such a range, treat it as a shape reference only;
**the range itself must be rewritten for the current runtime every time**.

If you really must install a plugin with an incompatible peer, authorize it as an **exact version pair**; the exemption is written into the profile's own `compatibility.json`,
**neither a plugin upgrade nor a DSH upgrade inherits the authorization**, and `acceptRisk: true` may only be passed after clearly warning about the risk and obtaining permission.

### 9.4 `Config`: shape requirements and "prefer not to write one"

```js
import Schema from '@deepseek-ai/schemastery'   // ← this import is required
export const Config = Schema.object({ keepAttachments: Schema.boolean().default(false).description('...') })
```

- Declaring a `Config` → the Loader **validates** that row's `config` on activation, and `Config.listConfigs` publishes a JSON Schema.
- ⚠️ **`Config` must be a native schemastery object**: the Loader calls `Config['~standard'].validate`,
  and the Harness inspection surface requires `Config[Symbol.for('schemastery')] === true` with `type` / `meta`.
  **Hand-writing a plain object that "looks like" a Standard Schema makes the whole row fail to activate** (✅ measured `TypeError: … reading 'validate'`),
  or at best turns `status` into `unsupported`.
- **Not exporting a `Config` is perfectly legal, and recommended**: the raw row `config` is passed to `apply` unchanged.
  If you cannot obtain schemastery (§9.1), do not build half a schema — put the tunable values in the row `config` and read them **defensively** in `apply`:

```js
function sessionsRootOf(config) {
  const v = typeof config?.sessionsRoot === 'string' ? config.sessionsRoot.trim() : ''
  return v || defaultRoot()
}
```

**The `status` values** (read at the time (`0.2.0-rc.2`) from `dsh-tool-cordis`'s source; a newer version may add values,
and when you meet an unknown one treat it as "the module loaded and something else is wrong" and go read that version's `liveConfig()`):

| `status` | Meaning |
|---|---|
| `schema` | The module imported and a **native** `Config` was read |
| `inactive` | The row exists but did not activate |
| `absent` | **No** `Config` export (the normal shape) |
| `unsupported` | **There is** a `Config` but its shape is wrong → the settings page cannot render a form |
| `tree` | The row is a group / subtree, not a plugin |

> `Config.listConfigs { entry }` can also read that row's **`packageDir`** (a reference implementation's source directory) and
> `acceptsMissing` / `limitations`.

### 9.5 Extracting the runtime's packages and versions (the asar probe)

The runtime table is the dependency keys of `dsh/package.json` inside `app.asar`. **The script lives in the snapshot folder**:
[`版本快照/0.2.0-rc.2/_tools/asar-extract.js`](版本快照/0.2.0-rc.2/_tools/asar-extract.js)
(workflow §3.1 has the same one, and the explanation is there).

```sh
node 版本快照/0.2.0-rc.2/_tools/asar-extract.js "<install dir>/resources/app.asar" \
     "/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace" "_ref/ui-workspace"
```

Three disciplines that do not change with the version:

1. **The asar header layout is not a DSH contract** — it is decided by Electron, and a DSH upgrade that changes Electron can change it.
   The script carries three self-checks (workflow §3.1); **when it cannot read, switch to a ready-made parser such as `@electron/asar`** instead of forcing the offsets.
2. **The content inside the archive may be CJS-wrapped** (the entry bytes look like `};{`), so parsing the whole block as JSON fails —
   back up a few bytes and brace-match, or take only the first complete object.
3. **There are no `.d.ts` files inside asar**: type information lives only in the JSDoc of the compiled `lib/*.js`, or read the source repository.

---

## 10. Troubleshooting index

> The **diagnostic strings** in these tables are the raw output of `0.2.0-rc.2` (a new version may reword them), but **each row's "cause" is a mechanism**
> that does not change with the wording. Diagnose by "cause" first; the string is only an entry point.
> Those raw strings and the `status` value table live in the snapshot: [`版本快照/0.2.0-rc.2/诊断文案.md`](版本快照/0.2.0-rc.2/diagnostic-text.en.md).

### A. The plugin never came up

| What you see | Most likely cause | Where |
|---|---|---|
| `application: "failed"` + `did not activate … failed to import` | A fallback string with no cause. With zero imports, check the **`Config` shape** and **top-level code** first | §9.2, §9.4 |
| The diagnostic **carries a stack** (`TypeError: … at …`) | The module imported; `apply()` / `Config` validation threw — follow the stack | §9.2 |
| The row became a detached `disabled: true` | **A peer range mismatch** → the compatibility gate blocked it | §9.3 |
| The whole package was skipped (`skippedBundles`) | The composition package's own DSH peer is incompatible | §9.3 |
| The row exists but `fiberPhase` is not `active` | A service in `inject` does not exist → make it a soft dependency with `ctx.inject` | §1, §8.1 |
| `status: "unsupported"` | The `Config` shape is not native schemastery | §9.4 |
| `status: "inactive"` | The row did not activate (possibly overridden by a higher layer) | §9.2 |
| The result contains `pendingBuilds` | pnpm intercepted install scripts and needs the user's explicit approval | §6.7 |

### B. Code changed but "did nothing"

| What you see | Cause | Where |
|---|---|---|
| The disk has new code, the behavior is old | ESM caches by URL | §6.3 |
| Toggling the plugin changes nothing | A toggle does not reload the module | §6.3 |
| You want a new generation without restarting | ✅ `hmr.root` | §6.3 |
| Weird behavior after "changing the path" | The old generation was not unloaded → old routes live on / a duplicate route throws | §6.3 |
| The Client side does not react | Refresh once to rule out timing; only a persistent old behaviour means the generation did not swap | §6.3 |
| You are unsure which generation is running | File mtime **vs** process start time | §6.3 |

### C. UI blank / wrong

| What you see | Cause | Where |
|---|---|---|
| Console: `slot entry crashed in '<slot>'` | The component threw; most often **destructuring a nonexistent export** | §7.2 |
| The whole slot is blank | Same as above (one throwing branch blanks the **entire** entry) | §7.2 |
| The component never renders | It registered into a slot that does not exist in the **current composition** | §7.5 |
| It shows **raw keys** | `locale: NS` was declared without `ctx.locale.register` | §7.4 |
| **Raw keys even though the dictionaries are registered** (and one reload fixes it) | The `t` seat came from a namespace **whose dictionary is not installed yet** (`translate` falls back to `?? key`) → the seat must not be trusted blindly | §7.4 |
| You do not get the props you expected | Props are decided by standard props / `ownerProps` / `hookContext`, and **must be queried** | §7.5 |
| The theme does not follow light/dark | Literal colors were used | §7.3 |
| Styles break inside an iframe | Do not use an iframe | §7.3 |
| The manager page shows **English / the package name** instead of the Chinese in `locale/zh.json` | The locale file used the **flat** shape (`{title,…}`) → the reader only looks at `parsed.meta` and silently ignores the whole file | §6.1, snapshot [`展示元信息-形状.md`](版本快照/0.2.0-rc.2/display-metadata-shape.en.md) |

### D. A service cannot be obtained

| What you see | Cause | Where |
|---|---|---|
| `ctx.get('someService')` returns `undefined` | An asynchronously activated service; `ctx.get` is strict | §8.1 |
| `cannot get property X without inject` | That service is not in `inject` | §1 |
| A service you registered yourself is absent from `listService` | Self-provided services are not catalogued — invisible ≠ unregistered | §4.6 |
| Two registration paths behave differently | `ctx.get` and `ctx.inject` attach effects to different contexts | §1 |

### E. Routes / security

| What you see | Cause | Where |
|---|---|---|
| A request with no credentials **reached the business logic** | An exact route precedes the 401 fallback; webserver does no authentication | §4.4 |
| The check is there but still bypassable | It was placed **after** the method / body checks | §4.4 |
| You want to confirm authentication works | An unauthenticated POST should get 401/403; use a nonexistent path as a control | §4.4 |

### F. A tool behaves wrongly

| What you see | Cause | Where |
|---|---|---|
| The model thinks it succeeded but nothing happened | A failure was returned as **success-shaped text** | §5.4 |
| "Execution failed" and "you typed it wrong" are indistinguishable | No separate try around the resolution phase | §5.4 |
| **Arguments of the wrong type reached the tool body** | Style B **does not validate arguments** (only `defineTool` does) | §5.2 |
| A completed operation is reported as "cancelled" | A hand-written `signal.aborted` branch | §5.4 |
| The model retries "argument error" forever | Something that is "legal but refused" was thrown as an error result | §5.4 |
| Deleting the caller's own session leaves inconsistent data | Missing an explicit "refuse to consume yourself" | §5.5 |
| **The row is still there after deleting** (gone only after a restart) | The event **the host itself** would emit was never broadcast | §4.7 |
| **Accounting was released but the files remain** → it falls into "Ungrouped" | Wrong order: accounting was touched before the files were deleted | §4.7 |
| Some cleanup steps failed and nobody knows | Only `logger.warn` was used (the desktop UI shows no logs) | §4.7 |
| The schema cannot express the constraint you need | No `anyOf`/`allOf`; a top-level `oneOf` and `properties` are mutually exclusive | §5.3 |

### G. The Host changed state and the UI does not know

| What you see | Cause | Where |
|---|---|---|
| Data changed but the UI does not update | Neither an allowlisted event nor your own authenticated route was used | §4.5 |
| A custom event never reaches the browser | The forwarding list is hardcoded; plugins cannot add to it | §4.5 |
| Adding one refresh makes rendering worse | A **second writer** was introduced (§11) | §11 |

### H. Install / naming / uninstall

| What you see | Cause | Where |
|---|---|---|
| `ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER` | A path with spaces was split by the shell | §6.6 |
| Loading fails after renaming the package | The package name / factory `id` / profile were not moved together | §6.5 |
| `ambiguous-install` when installing while already installed | There is no dependency difference to commit → `remove_bundle` first | §6.4 |
| A symlink remains in `node_modules` after uninstalling | pnpm's cleanup behaviour on Windows (harmless) | §6.4 |
| Install / reload reports "no matching row" | A patch still holds an override pointing at a deleted plugin | §6.2 |
| You cannot tell which copy you changed | Two copies of the same package name and version | §6.1 |

---

## 11. One rule that runs through everything: one writer per piece of state

**Two real counter-examples:**

- **Client side**: after the Host deleted data, an **extra** "refetch the whole list" was added to sync the UI, and it fought another accounting chain
  — an object already removed from A but not yet from B rendered as "Ungrouped".
- **Per-agent registrations**: something registered on `agent.ctx` has **two owners** (the agent and the registrant), and releasing only one of them leaks.

**The rule**: decide **who the single writer of this piece of state is** before writing code. When you need a second path, ask first "will it fight the first one?".

---

## 12. Acceptance list

### 12.1 Delivery flow

1. **Fix the outcome and the target location first** (an unspecified visual location = the current DSH Web UI). Ship a small installable version first, then polish the visuals.
2. **Discover only the APIs this version needs**: `cordis_inspect_list` → targeted `cordis_inspect_query`.
3. **Walk §2's 12 checks before writing code.**
4. **Install**: `install_bundle`, then read `application` / `warnings` / `diagnostic`.
5. **Verify** (pick layers by risk, §12.2).
6. **Fix observed defects in the same plugin**; when the result works, close out instead of continuing speculative variants.

### 12.2 The verification gradient by risk

| Layer | Means | What it proves |
|---|---|---|
| 1 | `node --check` on every JS file | Syntax |
| 2 | Manifest self-check (**run the script**: `版本快照/0.2.0-rc.2/_tools/清单自检.mjs`) — `main`/`exports`/`files` paths exist, `locale` shape, the client's `load id`, the patch exists, `Config` shape, and if a peer is declared its name and range | Installability (catches silent failures) |
| 3 | The `application` / `warnings` / `diagnostic` an `install_bundle` returns | Whether it took effect, and why not |
| 4 | `Config.listConfigs`'s `status` | **Module loaded ≠ activated** |
| 5 | A live call (call a tool once, send one unauthenticated probe, read the endpoint once) | It really works |
| 6 | `Slots.listSubTree` showing your own occupant with `active: true` | The registration succeeded |
| 7 | Visual verification (when browser control exists); **when a Client change does not show, run it after one refresh to rule out timing** | What the user sees |

**The riskier the change (writing an endpoint, deleting data, changing permissions), the further down you must go.**

### 12.3 Environment limits (do not waste time here)

- Prefer the **already authenticated page connected to the Harness**.
- **Do not** start a separate browser from a shell, change `HOME`, dig through personal browser profiles, search for authentication tokens, or touch the keychain to obtain a screenshot.
- Without browser control, visual verification **is limited to** syntax + manifest + live slots, and you must **state explicitly that visual verification was unavailable**.
- **Do not** go looking for a rasterizer, invoke Quick Look, extract SVG into preview files, emulate React/DOM, or build your own renderer.
- **A screenshot of a mock page is not verification of a running plugin.**
- **Before the first install, do not** build preview HTML, mock shells, design variants, or screenshot scripts — **use the installed plugin itself as the first preview**.

---

## 13. One-page quick reference

```
plugin  a module exporting apply(ctx, config) / a Service subclass
ctx     the service container (ctx.tools / ctx.sessions / ctx.slots ...); get services by key, do not import implementations
inject  hard dependencies; soft dependencies use ctx.inject(['x'], sub => ...); ctx.get is strict (only for per-request re-resolution)
effect  a registration = a reversible side effect (tools / slots / routes / timers all get wrapped)
events  emit / waterfall / parallel / serial / bail; a waterfall that does not own the decision must return next()

manifest name is the identity; main + exports["."] are required; the Client needs exports["./client"] + dsh.client
         icon ≤256KiB relative path; meta or locale/*.json is "manager page" copy (≠ runtime copy)
         locale/<lang>.json must be NESTED {"meta":{title,description}} — a flat one is silently ignored
patch    a top-level array; insert appends; { id, config } overrides and config is replaced wholesale; !!js not !js
         when removing a plugin, also remove the overrides pointing at it

install  plugin_manager install_bundle, target = absolute package directory; quote CLI paths containing spaces
diagnose application/warnings/diagnostic + Config.listConfigs' status
         "failed to import" is a fallback string; only one with a stack is the real error
         status: schema=native Config / absent=no Config export (normal) / unsupported=wrong shape / inactive=not activated
generation one module is evaluated once per process; neither toggling nor reinstalling changes the generation
         ✅ the hmr row's config.root = [your src]; ❌ changing the path (the old generation is not unloaded)
         with hmr.root in place BOTH halves hot reload (the Client one swaps revision via an SSE `rebuilt` frame)
         when a change does not show up, refresh once to rule out timing — it is a diagnostic step, not a swap
uninstall installing again while installed → ambiguous-install; remove_bundle first
         uninstalling cleans the manifest and lockfile; Windows may leave a junction (harmless)

import  ⚪ prefer zero @deepseek-ai/* imports: a profile install usually has none on its resolution path
         if you really need one, declare it as a profile dependency; take services from ctx
peer    optional. Declaring it enables the compatibility gate: a wrong range → the whole package is skipped; pin the exact version if you declare
Config  must be native schemastery; if you cannot produce one, do not export it (recommended) — the raw config reaches apply
         put tunable values in the row config and read them defensively in code

UI      __ModuleLoader__.load({ id: package name, factory(require) {...} })
        ctx.slots.inject(key, () => ctx.slots.register(row, Component))
        read props from Slots.listSubTree (standard props + ownerProps + hookContext)
        only --dsw-alias-* tokens; floating surfaces use shell.overlay, do not portal yourself
        a dynamic module package may require the platform seed table (including ui-primitives); check exports exist before destructuring
copy    locale: NS only provides t; you must ctx.locale.register(NS, { zh, en })
        ⚠️ never trust the seat blindly: with no dictionary in the namespace translate falls back to `?? key`
           → use it only when it is non-empty and != the key, otherwise fall back to the built-in dictionary
           (otherwise the first open shows raw keys)

mutating host state (delete / reassign)
        order   flush → delete → **verify it is really gone** → only then touch accounting
        broadcast  emit **the event the host itself** would emit (deleting files does not dispose → the UI will not update by itself)
        writes  prefer the public API; only write the live table (in-memory state) when there is none, and comment why
        failure collect partial failures into degraded[] and return them with the report (the desktop UI shows no logger)
        counter-example  adding one more "full refresh" = a second writer → broken rendering (§11)

tools   ⚠️ when registering hand-written JSON Schema 【the registry does not validate arguments】→ read args defensively in execute
        unusable arguments / a thrown execution error → throw; legal but refused / ran and failed → return text
        cancelled → do nothing (the framework replaces it with ABORTED)
        the schema has no anyOf/allOf, and a top-level oneOf and properties are mutually exclusive
        one implementation per operation, shared by UI / tool / route; an operation must refuse to consume itself
        to verify tool behavior you can only dispatch a subagent to call it (the Tool provider cannot call)

routes  webServer does no authentication; an exact route precedes the 401 fallback
        → you must call ctx.connection.requestRejection({ headers }) yourself, fail closed, and put the check first
events  only allowlisted host events reach the browser; existing Remote namespaces are usable, but you cannot add new ones
        "a failure must be known" must be folded into the report returned to the caller (the desktop UI shows no logger)

verify  node --check → manifest → application/warnings → status → live → slots → visual
```

---

## 14. Methodology: the distance between an observation and a conclusion

Behind every "measured" claim above is one misjudgement, and they are almost all the same kind:
**using one observable phenomenon to vouch for another fact that was never observed.**

| A wrong judgement once made | What was wrong | What to do |
|---|---|---|
| "All `@deepseek-ai/*` imports fail" | Treated a **fallback string** as evidence; ran no single-variable comparison | Replacing that one import worked → the real cause was the resolution path |
| "Newly installed fails, already-composed succeeds" → filed as **undetermined** | Gave up on attribution instead of adding an observation | Ask "which single variable differs between the two groups"; one comparison round closed it |
| "`ctx.get` can reach an async service" | Treated source inference as fact | Measured `undefined` → switched to `ctx.inject` |
| Using "is the target still in the list" as the criterion | The criterion had no discriminating power | Any deleted object leaves the list immediately |
| Adding a refresh to dodge a race | Introduced a second writer | It fought the other chain → broken rendering |
| "Changing the path forces a new generation" | **Verified only the half I wanted** | The side effect was the point: the old generation is not unloaded → switched to HMR |
| Recording the header field as `offset 8 = JSON length` | Wrote an assertion from memory | Measured that 8 is 4 greater than 12 |
| Reading a length 4 bytes long and starting 4 bytes late | **Two errors cancelled out**, so the output kept "working" | Verify intermediate quantities, not just the final result |
| "peer is necessary but not sufficient" | Wrong attribution | The error could not say which import failed |
| "The documentation says so, so it is true" | **Treated a description as a contract**: this document itself once taught the flat shape for `locale/*.json` | Compare against a **real artifact** (run the reader's own decision logic), do not trust the description |

> **Shape contracts are the easiest thing to "look right"**: the file exists, the JSON is valid, the keys are spelled correctly — only the nesting is one level off, and
> nothing errors and nothing takes effect. For any "structure / nesting / shape" convention, **compare against at least one official artifact**
> (on this version all 20 `locale/*.json` files inside asar are nested), and freeze the decision logic into a machine check
> (see `_tools/清单自检.mjs` in the snapshot folder) instead of leaving it to the next person's eyes.

**Six actionable rules**

1. **Only evidence that discriminates between causes is evidence.** `Config.listConfigs`'s `status` can distinguish "module loaded" from "activated" → worth writing into documentation; `failed to import` cannot discriminate → it must not support a mechanism claim.
2. **Label inferences as inferences** and keep them apart from measurements (this document uses ✅/📖/⚠️). **"Unexplainable" may only be written after a single-variable comparison has excluded every candidate.**
3. **One writer per piece of state** (§11).
4. **Snapshot-like conclusions have a shelf life**: process start time, profile contents, version numbers and ports all change — **re-read them before quoting**.
5. **Execute your own writing verbatim too**, especially code fragments marked "verified".
6. **When verifying a "working" approach, treat its side effects as items to verify as well.**

> ⚠️ The hardest-to-spot variant of rules 5 and 6: **correct output ≠ correct derivation.**
> The asar probe once made two errors at once (length 4 bytes too long, start 4 bytes too late), and they happened to cancel → it **kept "working"**.
> **The actionable move: verify the intermediate quantities.** Whenever a result is **decided by several quantities together** (offset + length, path + pattern, timeout + retry),
> you must be able to say what each intermediate quantity **should** be — otherwise one error hides behind another.

---

## Appendix: reproducible criteria

| What you want to know | Criterion | Expected |
|---|---|---|
| Did this plugin take effect | The install result's `application` / `warnings` | `applied` + `[]` |
| The module loaded **and** activated | `Config.listConfigs`'s `status` | `schema` (native Config) or `absent` (none, normal) |
| Whether the `Config` shape is right | same as above | `unsupported` means the shape is wrong |
| The route is connected to the host's trust policy | Unauthenticated POST to your route | `401`/`403` **and the body is your own JSON** |
| Whether exact routes really take precedence | Unauthenticated POST to a **nonexistent path** | 405 / the static layer (the control) |
| A slot registration succeeded | `Slots.listSubTree`'s `occupants` | your `id` with `active: true` |
| Whether an async service can be `ctx.get` | `ctx.get('<name>')` inside `apply` | An async service reads `undefined` → use `ctx.inject` |
| Whether a package can be imported | the resolution-path rule in §9.1 | For a profile install: not on the path → it fails |
| Whether tool arguments are validated | Call once with an argument of the **wrong type** | Style B does **not** validate (the value reaches `execute`) — guard yourself |
| A tool's real result shape | **Dispatch a subagent to call it** | `Tool.listTools` lists schemas only |
| Whether new code is running (Host) | File mtime **vs** process start time | A later process start means a new generation |
| A new generation without restarting | The `hmr` row's `config.root` contains the source directory | Editing a file reloads it |
| Whether an uninstall was clean | After `remove_bundle`, query `listConfigs` by package name | An empty directory |
| Whether a Client change needs a refresh | If the behaviour did not change, refresh once and look again | Changed after the refresh = it was already live (timing); still unchanged = no `hmr.root`, or the file is outside the watched directory |
| Why the manager page has no icon/title | Check `icon` (≤256 KiB, relative path) and `locale/*.json` | §6.1 |
