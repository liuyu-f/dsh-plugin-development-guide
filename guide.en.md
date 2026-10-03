# DSH Plugin Development Guide

> [中文](指南.md) ｜ English ｜ [Workflow](workflow.en.md)

Everything you need to write a plugin that runs in DeepSeek Harness.
**Read the [Workflow](workflow.en.md) first**; this guide is the reference you keep open while coding.

## 1 Mental model

A plugin is a module with `apply`. `ctx` is the service container: **take services by key, never import implementations**.

```js
export function apply(ctx, config) {}
export const inject = ['tools']        // hard dependency: do not start without it
```

| Concept | Rule |
|---|---|
| Hard dependency | `export const inject = [...]` → use `ctx.tools` directly |
| Soft dependency | `ctx.inject(['x'], (sub) => ...)`: runs when the service is there, skips when it is not, re-runs if it is replaced. Do **not** write a "`ctx.get` fast path + `ctx.inject` fallback" pair — the two branches attach their effects to **different contexts** with different lifetimes, and unload leaks |
| Re-resolve per call | `ctx.get(name)` (**strict**: only returns services whose provider is already active, so an asynchronously activated service reads as `undefined` here) |
| A registration is a side effect | Tools, slots, routes and timers all go inside `ctx.effect(...)` / `ctx.on(...)`; the owning context calls the returned disposer on unload/hot reload |

Events have five dispatch modes (query them with `Event.listEvents`). **Only the listener that owns the decision may short-circuit; observers must `return next()`.**

### Can I import Harness packages?

Services always come from `ctx`. **If you do import `@deepseek-ai/*`, it must be on the resolution path**: a workspace directory `link:`ed into the profile cannot resolve it (the upward search starts in your workspace's `node_modules`), an installed plugin can. Confirm with one command before writing:

```sh
node -e "console.log(require.resolve('@deepseek-ai/dsh-tools'))"
```

A printed path means you can import; `MODULE_NOT_FOUND` means you cannot — then register a hand-written `ToolDefinition` (§4) instead of `defineTool`, and read tunables from the row config instead of importing `Schema` (§3).

## 2 Manifest and composition

```
my-plugin/
├── package.json        manifest
├── cordis.patch.yml    insert your row into the Loader composition
├── index.js            Host half
├── client.js           browser half (delete when there is no UI)
├── icon.svg            manager-page icon
└── locale/{zh,en}.json manager-page title/description (≠ runtime copy, see §8)
```

```json
{
  "name": "@local/my-plugin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "index.js",
  "exports": { ".": "./index.js", "./client": "./client.js", "./package.json": "./package.json", "./locale/*.json": "./locale/*.json" },
  "files": ["index.js", "client.js", "locale", "icon.svg", "cordis.patch.yml"],
  "icon": "./icon.svg",
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" }, "client": { "platform": "web" } }
}
```

| Field | Point |
|---|---|
| `name` | The **identity** (the directory name is free); renaming it means also changing `client.js`'s `load({ id })` and the profile |
| `main` + `exports["."]` | The Host entry point; without it the package installs but never activates |
| `exports` | **Every key must be `.` or start with `./`** (writing `"package.json"` makes the whole field invalid and the manager page reports a "package metadata error") |
| `exports["./client"]` + `dsh.client` | The browser half; `platform` is required and currently only `"web"` |
| `icon` / `meta` / `locale/*.json` | Display information readable without activating the plugin |
| `peerDependencies` | Optional; declaring one enables the version gate, and **a wrong range gets the whole package skipped**. Skip it when you have no imports |

`cordis.patch.yml` is a top-level array: `insert` appends rows, `{ id, config }` overrides an existing row (**config is replaced wholesale, never deep-merged**).
Later composition layers win: `dsh.profile.bundles` → the profile's `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch` overlays.

## 3 Config

**Prefer not to export a `Config`**: the row's `config` reaches `apply` unchanged, so read it defensively in code.

```js
function rootOf(config) {
  const v = typeof config?.root === 'string' ? config.root.trim() : ''
  return v || defaultRoot()
}
```

If you do export one it must be **native schemastery** (requires `import Schema from '@deepseek-ai/schemastery'` to resolve):

```js
export const Config = Schema.object({ keep: Schema.boolean().default(false).description('...') })
```

A wrong shape (for example a plain object that merely "looks like" a Standard Schema) makes the **whole row fail to activate** with `Cannot read properties of undefined (reading 'validate')`.

## 4 Tools

**A hand-written `ToolDefinition`** (no dependencies):

```js
ctx.effect(() => ctx.tools.register({
  name: 'my_tool',
  description: 'One sentence saying what it does.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { path: { type: 'string', description: '...' } },
    required: ['path'],
  },
  output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
  async execute(args) { /* ← read the arguments defensively yourself */ },
}), 'my-plugin: tool')
```

**`defineTool`** (when `@deepseek-ai/dsh-tools` resolves): a flat table, `required: true` inside the field, and **the registry validates arguments for you**.

Two hard facts:

- **With a hand-written schema the registry does not validate arguments**: a wrong type reaches `execute`, so check the shapes at the top and `throw` when they are unusable.
- Schema expressiveness is limited: no `anyOf`/`allOf`, so cross-field constraints ("at least one of a or b") cannot be expressed — put them in `description` and enforce them at execution time.

**Result shapes carry meaning**:

| Situation | Shape |
|---|---|
| Unusable arguments, execution-time exception | `throw` (becomes an error result) |
| Legal but refused (policy / safety) | **text plus an alternative entry point** |
| Failed after running | a **text report** |
| Cancelled | **do nothing** (the framework replaces a success with `ABORTED`) |

**Do not forward `exec.signal` into an irreversible operation** (it may already have committed).

**Four adjacent facts**

| Point | Note |
|---|---|
| Changing tool visibility | To remove only, `ctx.tools.restrict()`; to deny only, `ctx.tools.guard()` (synchronous). To affect **one agent**, register on **that agent's context** — otherwise schema presentation, lookup and execution disagree |
| Verifying a tool | To test behaviour outside this session you can **only dispatch a subagent to call it** (`Tool.listTools` lists schemas and cannot call) |
| JSON parsing | After reading an HTTP body you must handle the JSON parse error yourself |
| Observing outcomes | Use `tools/result`; `tools/post-execute` only **transforms** a result |

## 5 HTTP routes

webserver **does no authentication and no origin policy**, and an exact route takes precedence over the 401 fallback — so **authentication is your responsibility, and it must fail closed**.

```js
ctx.inject(['webServer'], (sub) => {
  sub.effect(() => sub.webServer.register({
    kind: 'exact',
    path: '/__my-plugin/do',
    handler: async (req, res) => {
      const rejection = rejectUnauthenticated(ctx, req)          // ← the first thing
      if (rejection !== undefined) return sendJson(res, rejection, { ok: false, error: 'unauthenticated' })
      if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'method not allowed' })
      // only then read the body
    },
  }), 'my-plugin: route')
})

function rejectUnauthenticated(ctx, req) {                        // ← read per request, do not cache
  const connection = ctx.get('connection')
  if (!connection || typeof connection.requestRejection !== 'function') return 401   // fail closed
  try { return connection.requestRejection({ headers: req.headers }) } catch { return 403 }
}
```

`kind` has exactly two tiers: `"exact"` and everything else (the prefix table). Registering the same `kind`+`path` twice throws.

**Four easy-to-miss points**

| Point | Consequence / what to do |
|---|---|
| Authenticate **before** the method check and before reading the body | Not a single byte of an unauthenticated request should be read |
| An exact route precedes the 401 SPA fallback | Skipping authentication is not "too many permissions", it means **any web page can operate your plugin** |
| Not every event reaches the browser | The forwarding list is hardcoded in `dsh-api-remotes` and **plugins cannot add their own events**; existing Remote namespaces are usable |
| The desktop UI shows no `logger` | "A failure must be known" has to go into **the report returned to the caller** (both the UI and the tool path can read it) |

## 6 UI (the Client half)

```js
window.__ModuleLoader__.load({
  id: '@local/my-plugin',        // ← must equal the package name
  factory(require) {
    const React = require('react')
    const { Button } = require('@deepseek-ai/dsh-client-ui-primitives')

    function Widget(props) { return React.createElement(Button, { variant: 'ghost', size: 'sm' }, 'hi') }

    function apply(ctx) {
      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock', id: 'myPluginWidget', order: 10, locale: 'myPlugin',
      }, Widget))
    }
    return { inject: ['slots', 'locale'], apply }
  },
})
```

- **Lane**: a hand-written `client.js` (a dynamic module package) may `require` the platform seed table, including `ui-primitives`; compiled in-platform packages and the dynamic runner may **not** require Harness Client packages. Check that an export exists before destructuring — one wrong name blanks the **entire slot**.
- **Slots**: choose the location by `purpose` with `Slots.listSubTree { root }`, and read its `catalog` for the standard props / `ownerProps` / `hookContext`. Always use `ctx.slots.inject(key, cb)` (it waits for the declaration and removes your entry when it collapses); the registration object needs an `id`.
- **Styling**: only the `--dsw-alias-*` tokens `Theme.listTokens` lists; floating surfaces use the `shell.overlay` slot — do **not** portal to `document.body` yourself, and do not read another plugin's DOM or styles.
- **No side effects in the factory**; styles, timers and listeners are registered inside `apply` and cleaned up in an effect.
- **The standard props already carry the current session**: `props.sessionId` and `props.useSessions(selector)` (read a session summary such as running state or title). **Hooks must be called unconditionally at the top of the component** — wrap them in a tiny hook such as `useSummaryOf(useSessions, id)` rather than calling them inside an `if`.
- **A menu row dismisses its own menu**: the `useMenuOpenState()` injected into a menu-item slot returns `[open, setOpen]`; call `setOpen(false)` after acting.
- **Module-scoped state plus a subscription**: when two slot entries (a button and an overlay) share state, use a module-level `let` + a `Set<listener>` + `useState`; remember `useState(fn)` treats a function as a **lazy initializer**, so pass `useState(() => getState())`.

## 7 State

| The state you need | Use |
|---|---|
| Derived from the session log | `ctx.sessionProjections.register({ key, stateSchema, init, apply, stateVersion })`. `apply` is **pure and synchronous** and must **return the same reference** for events it ignores; bump `stateVersion` when fields or fold semantics change |
| A value the Client needs | declare `wire: { viewSchema, view }` on the projection, compute it on the Host; **the Client must not fold events itself** |
| Plugin-owned data | a storage service found through inspection |
| Per-agent state | take `agent.ctx` in `agent/created`, wrap it in one `agent.ctx.effect()`, and **keep that disposer keyed by agent in your plugin's own effect** (unloading the plugin does not release `agent.ctx` registrations) |
| Waking an agent | a timer that starts work calls `agent.followup()` (**wakes**); adding only context uses `agent.inject()` (**does not wake**, and may wait in the inbox). Clear the timer in the effect that owns it |

**Do not append session events with a new `type`**: a reader only accepts an unknown stored event whose envelope carries `ignorable: true`, and a live `Session.append()` cannot set that marker, so the session would refuse to reopen.

**One writer per piece of state.** When you want a second path, first ask whether it will fight the first — two real counter-examples: after the Host deleted data, a client-side "refetch the whole list" rendered objects as "Ungrouped"; a per-agent registration has two owners, so releasing only one leaks.

**Mutating host-owned state (deleting data, changing ownership)**: flush → delete → **verify it is really gone** → only then touch accounting → emit the event the host itself would emit (otherwise the UI never finds out). Prefer the host's public API; write the live table directly only when there is none, and comment why. Fold partial failures into the report returned to the caller (the desktop UI shows no `logger`).

## 8 Copy

Visible copy goes through the locale service, and you register the dictionaries yourself:

```js
ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'my-plugin: dictionaries')
```

**Even when registered, raw keys can still show**: `translate` **returns the key itself** while the namespace has no dictionary yet, and a component can render before registration lands. So never trust the `t` seat blindly — use it only when the result is non-empty and not the key, otherwise fall back to a built-in dictionary:

```js
function resolveText(seat, key, values) {
  if (typeof seat === 'function') {
    try { const t = seat(key, values); if (t && t !== key) return t } catch {}
  }
  return builtinText(key, values)
}
```

**Manager-page copy is a different thing**: `locale/<lang>.json` must use the nested shape `{"meta":{"title":…,"description":…}}` (a flat one raises no error but is ignored entirely).

## 9 Install, generations, troubleshooting

```
plugin_manager { action: "install_bundle", target: "<absolute plugin directory>" }
```

Only `application` and `warnings` decide anything. Installing while already installed reports `ambiguous-install`; `remove_bundle` first.
To change version or directory: **remove, then install**. To pause it: `set_bundle { enabled: false }`.

**A change that does not take effect**: within one process a module is evaluated once, and neither toggling nor reinstalling changes the generation. The right way is to put the source directory into the `hmr` row:

```yaml
- id: hmr
  config: { root: [F:/path/to/my-plugin/src] }
```

Editing a file hot-reloads it, and **both halves follow** (the Client swaps its module revision through an SSE `rebuilt` frame).
**When a change does not show, refresh the page first** — that rules out timing, it does not swap code: if the behaviour changed after the refresh it was already live; if it is still the old behaviour, this generation never swapped in.

**Three hard facts about installing**

| Point | Note |
|---|---|
| Every `plugin_manager` action needs `danger-full-access` or a per-call approval | **including `list_plugins` / `list_bundles`**; a refusal or cancellation means it did not run. Approval **does not change** the session's permission mode |
| Installed Host code runs inside the host process | **not limited by the workspace sandbox**; approving install scripts (`prepare`/`postinstall`) means "let it run with the host user's privileges" |
| `link:` does not install the linked package's dependencies | To import a dependency, run `pnpm install` yourself in the plugin directory (or ship it as a tarball and install that) |

**The four troubleshooting entry points**: `application`/`warnings` → `diagnostic` (a stack means the real error; `failed to import` is a fallback string) → `Config.listConfigs`'s `status` → `Slots.listSubTree`'s `occupants`.
