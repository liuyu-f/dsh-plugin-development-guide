# Workflow: from "I want to build something" to "it actually runs"

> [中文](DSH-插件开发工作流.md) ｜ English
>
> *English mirror of `DSH-插件开发工作流.md`; that Chinese file is the source of truth if they disagree.*

> This document teaches no APIs, only the **order of actions**.
> The matching API detail lives in [DSH Plugin Development Guide](DSH-插件开发指南.en.md).
>
> **The problem it solves is specific**: you start writing code from a vague idea, halfway through you find the slot does not exist, the service signature was a guess, the export name is wrong — and you grind through "change a bit, restart, look again" until the notes are full of "undetermined", "probably", "not necessarily measured".
>
> **The root cause is not laziness, it is the wrong order**: writing code from imagination, then reverse-engineering facts from what the runtime does.
> The right order is: **get attributable facts first, then write code, then verify with mutually corroborating evidence.**

---

## 0. One-line version

```
First ask "how would I know?" → then look it up (copy references into _ref/) → then write → then corroborate with several independent checks → only then conclude
```

**Without evidence that discriminates between causes, "I got it to work" is not a conclusion.** That sentence is the foundation of this whole workflow.

---

## 1. The seven stages

| Stage | What you produce | Done when |
|---|---|---|
| 1. Frame it | One sentence of outcome + target location + success criteria | You can answer "what does the user see / what counts as success" |
| 2. Gather evidence | Every name you will use has a source | Every name came from a query result, not memory |
| 3. Copy a reference | One readable reference implementation in `_ref/` | You read at least one sibling implementation's source or README |
| 4. Write it | Code that is syntactically right and right the first time | `node --check` passes + the manifest self-check passes |
| 5. Install | `application: applied` + `warnings: []` | Both fields are clean |
| 6. Verify | Enough verification layers for the risk (see §6) | You have live evidence, not just "it installed" |
| 7. Close out | Conclusions state their source; unknowns become criteria | The manual contains no "probably", "maybe", "undetermined" |

**Do not skip stages**: do not enter stage 4 before stage 2 is done. 90% of grinding happens when that line is crossed.

---

## 2. Stage 2, gather evidence: replace "memory" with "a query"

DSH exposes everything you should ask as **queryable interfaces** (`cordis_inspect_list` first, to see which providers exist):

| What you are about to write | Must query first | What goes wrong without it |
|---|---|---|
| UI | `Slots.listSubTree { root }` | The slot does not exist / props guessed wrong |
| Host logic | `Service.listService { service }` | Method name, parameters, return value guessed wrong |
| Event listeners | `Event.listEvents` | Wrong dispatch mode (a waterfall without `next()` short-circuits the whole chain) |
| Tools | `Tool.listTools` + the target service's signature | Wrong parameter shape; designing a constraint that cannot be expressed |
| Theming | `Theme.listTokens` | Hardcoded colors that break on light/dark switch |
| Injected symbols | `Builtin.listBuiltins` | Using an injection that does not exist |
| Config | `Config.listConfigs { name }` / `{ entry }` | Wrong config field names, or writing a `Config` of the wrong shape |

**Three hard rules:**

1. **Every identifier needs a source.** Slot names, prop names, method names, export names — all from a query result or from bundled source.
   A name written from memory does not fail loudly (`require` returns `undefined` → the whole slot goes blank), and the cost is high.
2. **The `Tool` provider cannot call tools.** To verify tool behavior, **dispatch a subagent to call it** (give it exact arguments and tell it to report the raw result verbatim).
   That is where this document's two tool conclusions came from.
3. **Not found ≠ does not exist.** A service you registered yourself is not catalogued in `listService`; when a query comes up empty, read the bundled source.

---

## 3. Stage 3, copy a reference: the `_ref/` protocol

**Before writing any plugin or component, copy the relevant docs and reference implementations into `_ref/` in your workspace.**

The reason is practical: DSH's package docs and `.d.ts` files **live inside `app.asar`**, and `cat` / `rg` / `node` / `pnpm` cannot read them (they are not ordinary files). Extract them once and they become ordinary files you can read, search, and compare freely.

### 3.1 The extraction script (keep it as `_ref/_tools/asar-extract.js`)

```js
// Extract from asar: extract(src, <path inside asar>, <target dir>)
// Header layout: [0..4) constant 4 | [4..8) pickle total | [8..12) JSON length + 4 | [12..16) JSON length
import fs from 'node:fs'
import path from 'node:path'

const [file, target, outDir] = process.argv.slice(2)
const fd = fs.openSync(file, 'r')
const head = Buffer.alloc(16)
fs.readSync(fd, head, 0, 16, 0)
const jsonLen = head.readUInt32LE(12)          // ← read offset 12
const raw = Buffer.alloc(jsonLen)
fs.readSync(fd, raw, 0, jsonLen, 16)
const tree = JSON.parse(raw.toString('utf8'))  // ← exactly a complete JSON document, no trim needed
const dataStart = 16 + jsonLen                 // ← start of the data area

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
    fs.readSync(fd, buf, 0, buf.length, dataStart + Number(child.offset))  // offset is a string; convert it
    fs.writeFileSync(dest, buf)
    n++
  }
}
walk(tree, '')
fs.closeSync(fd)
console.log(`extracted ${n} files -> ${outDir}`)
```

Usage (`<install dir>` is the directory containing `DeepSeek Harness.exe`):

```sh
node _ref/_tools/asar-extract.js "<install dir>/resources/app.asar" \
     "/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace" \
     "_ref/ui-workspace"
```

### 3.2 What to copy

| What you are building | Copy this |
|---|---|
| **A complete, installable starting point** | **`版本快照/<version>/最小实现/demo-plugin/`** (tool + authenticated route + real slot + locale fallback) |
| Something that shows up in the UI | The package that declares that slot (e.g. `dsh-client-ui-workspace`) — see how it registers its own entries of the same kind |
| Host service usage | The package that owns the service (e.g. `dsh-workspace`, `dsh-session-projection-cache`) |
| Tool definitions | Any `dsh-tool-*` package (e.g. `dsh-tool-todo`) |
| A complete plugin skeleton | `templates/` and `references/` under `@deepseek-ai/dsh-agent-preset/skills/cordis-plugin-development/` |
| Composition / patch syntax | The `cordis.patch.yml` of `@deepseek-ai/dsh-base` and `@deepseek-ai/dsh-web-app` |

### 3.3 Do not confuse three directories

| Directory | What it holds | Who creates it | Lifetime |
|---|---|---|---|
| `_ref/` | The reference implementations **for this task** (extracted packages, frontend artifacts, probe scripts) | You, before writing | Throwaway, delete any time |
| `版本快照/<version>/` | Values the manual's author queried **on one version** (ownerProps, seed table, field tables, diagnostic text, a minimal implementation) | The manual's maintainer, archived per version | Follows that version; re-gather and archive a new folder after an upgrade |
| Your plugin directory | The deliverable | You | Long-lived |

**How to decide where a value belongs**: will it change when someone else upgrades DSH?
If yes → it may only live in `_ref/` or `版本快照/`, and **the body keeps nothing but "where to look it up"** (§8.1).

### 3.4 Three things to do after copying

1. **Read the README's "implementation internals" collapsible section**: bundled READMEs often state that package's slot declarations, hook contracts, and caveats directly.
2. **Read the JSDoc in its `lib/*.js`**: there is **no `.d.ts`** inside asar; type information lives only in JSDoc and source.
3. **Turn "how it does it" into "the checklist I am following"**, not "how I guess it might do it".

> `_ref/` is a reference area, not a deliverable. Delete it any time; but **you must have it before you start writing**.

---

## 4. Stage 4, write it: the get-it-right-the-first-time checklist

Tick these off before writing a line (each item's reasoning is in the matching guide section):

- [ ] The packages I import, **are they on the resolution path?** (a profile install usually is not → write with zero imports)
- [ ] `Config` is **either** native schemastery **or** not exported at all
- [ ] `peerDependencies` is **either** undeclared **or** pinned to an exact version (a wrong range gets the whole package skipped)
- [ ] Every slot name, prop name, and method name came from a query result
- [ ] The names destructured on the client side **were checked to exist** (otherwise the whole slot goes blank)
- [ ] Copy goes through the locale service; styles use only `--dsw-alias-*`
- [ ] `locale/<lang>.json` uses the **nested** shape `{"meta":{title,description}}` (a flat one is silently ignored)
- [ ] A tool registered with hand-written JSON Schema: **validate the arguments yourself** in `execute` (the registry does not)
- [ ] A self-built HTTP route: **authentication is the first line**, and it fails closed
- [ ] Every registration is wrapped in `ctx.effect` / `ctx.on` (so unload is clean)
- [ ] `node --check` passes for every JS file

**Anything a machine can check, do not check by eye** (the automated half of stage 4):

```sh
node 版本快照/0.2.0-rc.2/_tools/清单自检.mjs <your plugin directory>
```

It specifically catches **silent failures that raise no error**: a `main`/`exports` target that does not exist,
a `files` entry that does not exist, a `locale/*.json` in the flat shape, `dsh.client` declared without `./client`,
a client `load({ id })` that does not match the package name, a missing `dsh.bundle.patch`.
**Everything must pass before stage 5.**

**Tool result shapes** (the easiest thing to get wrong): unusable arguments / a thrown execution error → `throw`;
"legal but refused" or "ran and failed" → return **text plus the next step**; cancelled → **do nothing**.

---

## 5. Stage 5, install: only two fields count

```
plugin_manager { action: "install_bundle", target: "<absolute package directory>" }
```

- `application: "applied"` **and** `warnings: []` are what "it installed" means.
- On failure, read the `diagnostic` in the result — it carries a stack. `failed to import` is a fallback string with no cause.
- Installing the same package while it is already installed reports `ambiguous-install` — **`remove_bundle` first**.
- To change code without restarting: put the source directory into the `hmr` row's `config.root` (§6.3).

**Do not** infer activation state from panel text, terminal output, the process list, or logs. The desktop log directory is empty.

---

## 6. Stage 6, verify: pick a layer by risk, and **corroborate**

| Layer | Means | What it proves |
|---|---|---|
| 1 | `node --check` | Syntax |
| 2 | Manifest / `Config` shape / peer range self-check | Installability |
| 3 | `application` / `warnings` / `diagnostic` | Did this take effect, and why not |
| 4 | `Config.listConfigs`'s `status` | **Module loaded ≠ activated** |
| 5 | One live call (tool / endpoint / unauthenticated probe) | It really works |
| 6 | `Slots.listSubTree`'s `occupants` | The registration entered the tree |
| 7 | A look in the browser | What the user sees |

- **The riskier the change, the further down you must go**: endpoints, data deletion, permission changes → at least layer 5.
- **At least two independent checks** count as verified. Example: after changing route authentication, check both "an unauthenticated POST gets 401 + my own JSON" and "a nonexistent path gets 405" as a control — the first proves the check runs first, the second proves the answer comes from your handler.
- **Discriminate causes**: `status` distinguishes "module loaded" from "activated"; `fiberPhase` shows whether the row is live; a `diagnostic` with a stack points at the line that threw. Pick the one that discriminates.

**When a change does not show up, refresh the page before concluding anything** — but that step only **rules out timing**, it does not swap code.
With `hmr.root` in place **both halves hot reload** (the Client one swaps its module revision through an SSE `rebuilt` frame);
behaviour changed after the refresh → the new code was already live and you simply observed late; still the old behaviour → the generation never swapped (bisect with steps 5 and 6 in §7).

---

## 7. Stage 7, when stuck: bisect, do not flail

**For "it did not take effect", bisect in this order; each step narrows the range:**

1. **Did the row activate?** → `Config.listConfigs { name }`'s `status`.
   `inactive` = the row never came up; `absent` = it came up without exporting `Config` (normal); `unsupported` = the `Config` shape is wrong.
2. **Did the module import?** → does the install result's `diagnostic` carry a stack?
   A stack = the import succeeded and `apply()` threw; `failed to import` with no stack = it threw during `_init`.
3. **Which line threw?** → read the stack; with the zero-import style, only top-level code and `Config` validation can throw in `_init`.
4. **Did the registration enter the tree?** → `Slots.listSubTree`'s `occupants` / `Tool.listTools` for tools.
5. **Is it still the old code?** → after replacing code: touch a file with `hmr.root` in place, or restart. **Do not use "change the path"** (the old generation is not unloaded).
6. **Is it really running?** → one live call.

**The bisection principle**: change **one** variable per step. The same package, only the import line deleted, only the `Config` shape changed —
that is how "the result changed" gets attributed to that one variable.

> ❌ The anti-pattern: change the path, the package name, the peers, and the import form at once, then ask "which one did it".
> Even if it works, you cannot say why — so the documentation can only record "measured working, cause unknown".

---

## 8. When are you allowed to write a conclusion

| Evidence | What you may write |
|---|---|
| Single-variable comparison, reproducible | ✅ **A fact**: "deleting this one import line makes it activate" |
| Stated by bundled docs or source | 📖 **A mechanism**: "the Loader calls `Config['~standard'].validate`" |
| A fallback string, an indirect symptom, something that cannot discriminate causes | ❌ **Nothing.** Go gather an observation that discriminates |
| Still unexplained after a single-variable comparison | ⚠️ Write a **criterion**, not a conclusion: tell the reader how to measure it themselves |

**If you cannot write it, delete it.** A manual's value comes from "following it is always right", not from coverage.
Better to cover one topic less than to state one wrong thing — readers will treat it as authoritative.

### 8.1 Do not put "version data" in a manual

**That rule has a subtler variant: copying the values you just queried into the manual as if they were conclusions.**

The consequence is worse than omitting them — a reader on a future version will **write code against an outdated value** without knowing they should re-check.

| Kind | Example | Where it belongs |
|---|---|---|
| **Mechanism / contract** | Registrations are owned by a context; `ctx.get` is strict; `oneOf` and `properties` are mutually exclusive; authentication is the route's own responsibility | ✅ **Into the manual** (does not change with versions) |
| **Version data** | Slot-name lists, token-name lists, package export lists, config fields and defaults, module seed-table members, version numbers | ❌ **Not into the manual**; turn it into "the command that queries it" |
| **"The value the author queried on their version"** | An interface body for one API, one line of output from one package at that time | ⚠️ Only as an **example**, and it must be labelled "this is a snapshot of one version; write what you query yourself" |

**The one-line test**:
> Will this value change when someone else upgrades DSH? If yes → it is version data; the manual keeps only the command.

**One more thing**: do not leave version data in the body propped up by a "⚠️ may be outdated" warning. Readers skip warnings.
The correct move is for it to **be structurally absent** — move the value into `_ref/` or `版本快照/` (which already means "a snapshot of one version, discard after use") and leave only "where to look it up" in the body.

---

## 9. Anti-pattern list: never do these

| Action | Why |
|---|---|
| Writing slot names / export names / method names from memory | It does not fail loudly; the cost is a blank slot or a silent no-op |
| "Change a bit — restart — look again" | This is **reverse-engineering facts from runtime results**; it turns a 10-minute job into 2 hours |
| Changing several variables at once and observing | Even on success you cannot attribute it, so it cannot go into documentation |
| Using "change the path" to force a new module generation | The old generation is not unloaded → a half-new, half-old runtime |
| Treating `logger.warn` as user-visible feedback | The desktop UI shows no logs; the user just sees "nothing happened" |
| Using panel text as proof of activation | The panel only reflects "the package is selected", not "it ran this time" |
| Adding "should / probably / maybe" to something unverified | Readers will treat it as authoritative; **either verify it or delete it** |
| Building mock HTML or screenshot scripts to "prove" UI | That is not verification of a running plugin |

---

## 10. One-page flow card

```
① Frame it   one sentence of outcome + target location + what counts as success
② Evidence   inspect for names (Slots/Service/Event/Tool/Theme/Builtin/Config)
             every identifier must have a source; if a query comes up empty, read the source
③ Reference  extract asar → _ref/<package>/ → read the README's "internals" + the JSDoc in lib
④ Write      tick the ten boxes in §4 + node --check
⑤ Install    install_bundle → application:"applied" and warnings:[]
⑥ Verify     walk the layers by risk; ≥2 independent checks corroborate; if a client change does not show, refresh once to rule out timing
⑦ Close out  only attributable conclusions; unattributable ones become criteria; delete the rest
             mechanisms go into the manual; version data keeps only "the command that queries it"

Stuck → the six-step bisection in §7, one variable per step

Two self-check questions: "how do I know this?" and "will this value change after an upgrade?"
```

**The last one, and the easiest to skip**:
every sentence you write must be able to answer "**how do I know?**".
If it cannot, that sentence is where the previous edition's "undetermined" entries came from.

**And the second question matters just as much**: will this value change when someone upgrades? If yes — it does not belong hardcoded in the manual.
