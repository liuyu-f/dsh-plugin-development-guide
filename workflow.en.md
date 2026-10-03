# DSH Plugin Development Workflow

> [中文](工作流.md) ｜ English ｜ [Guide](guide.en.md)

From "I want to build something" to "it actually runs". **Read this before you start; keep the [Guide](guide.en.md) open while writing code.**

## The seven stages

| Stage | Output | Done when |
|---|---|---|
| 1 Frame | One sentence: outcome + target location + success criteria | You can say what the user sees / what counts as success |
| 2 Evidence | Every name you will use has a source | Names come from queries, not memory |
| 3 Reference | One readable sibling implementation in `_ref/` | You read its README or source |
| 4 Write | Code that is right the first time | Syntax check + manifest self-check pass |
| 5 Install | `install_bundle` comes back clean | `application: applied` and `warnings: []` |
| 6 Verify | Enough layers for the risk | You have live evidence, not just "it installed" |
| 7 Close out | Conclusions are attributable; unknowns become criteria | No "probably / maybe / should" |

**Do not skip stages.** Entering stage 4 before stage 2 is done is what produces the "change a bit, restart, look again" loop.

## 1 Frame

Write one sentence: **for whom, where, what they see or can do, and what counts as success.**
A visual request with no location means the current Harness Web UI.

## 2 Evidence: replace memory with queries

```
cordis_inspect_list                       # see which providers exist first
```

| What you are about to write | Query this |
|---|---|
| A Host service's method signatures | `Service.listService { service }` |
| Event names and dispatch modes | `Event.listEvents` |
| The props a component receives | the `catalog` of `Slots.listSubTree { root }` |
| Theme tokens | `Theme.listTokens` |
| Whether a package can be imported | `node -e "console.log(require.resolve('<pkg>'))"` in the plugin directory |
| A package's config fields | `Config.listConfigs { name }` |

**Three rules**

1. **Every identifier needs a source** (slot names, prop names, method names, export names). A wrong name does not fail loudly: a blank slot, or a silent no-op.
2. **The `Tool` provider cannot call tools.** To verify tool behaviour, **dispatch a subagent** and tell it to report the raw result.
3. **Not found ≠ does not exist**: a service you registered yourself is not catalogued; read the bundled source instead.

## 3 Reference: extract the bundled docs

Bundled READMEs and `lib/*.js` live inside `app.asar`, which ordinary commands cannot read. Extract the package you need with any asar extractor:

```sh
node asar-extract.js "<install dir>/resources/app.asar" \
     "/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace" "_ref/ui-workspace"
```

The criterion: the extracted directory has `README.md` and `lib/*.js` (if the header layout does not line up — or you are debugging the extractor — switch to `@electron/asar`; it carries a self-check).
`_ref/` is **this task's reference area** — discard it afterwards; it is not a deliverable. Read the README's "internals" section first, then the JSDoc.

## 4 Write

- [ ] The packages I import are **on the resolution path** (the `require.resolve` line above)
- [ ] Every `exports` key starts with `.`; the files `main` / `exports` point at exist
- [ ] Slot names, prop names, method names and destructured primitive exports **all came from a query**
- [ ] `locale/<lang>.json` uses the nested shape `{"meta":{title,description}}`
- [ ] Tool arguments are **validated in `execute`** (the registry does not validate hand-written schemas)
- [ ] A self-built route authenticates on its **first line**
- [ ] Every registration is wrapped in `ctx.effect` / `ctx.on`
- [ ] Visible copy goes through the locale service; colours use only `--dsw-alias-*`

Run the machine check once (if you have a script, run it; otherwise walk the list above by eye): syntax, whether the files named by `exports`/`files`/`main` exist, the `locale` shape, and whether `client.js`'s `load({ id })` equals the package name.

## 5 Install

```
plugin_manager { action: "install_bundle", target: "<absolute plugin directory>" }
```

Only `application` and `warnings` decide anything. On failure read `diagnostic` (a stack means a real error).
Installing while already installed reports `ambiguous-install`: `remove_bundle` first.

## 6 Verify: pick layers by risk, and use at least two independent checks

| Layer | Means | Proves |
|---|---|---|
| 1 | `node --check` + the manifest self-check | Syntax and installability |
| 2 | `application` / `warnings` / `diagnostic` | Whether it took effect, and where it failed |
| 3 | `Config.listConfigs`'s `status` | Module loaded ≠ activated |
| 4 | One live call (invoke a tool / probe the endpoint with no credentials) | It really works |
| 5 | `Slots.listSubTree` showing your occupant | The registration entered the tree |
| 6 | A look at the page | What the user sees |

The riskier the change (endpoints, deleting data, permissions), the further down you must go.

## 7 Stuck: bisect, do not flail

**Change one variable at a time.** Narrow it down in this order:

1. **Did the row activate?** → `Config.listConfigs { name }`'s `status`
2. **Did the module load?** → does `diagnostic` carry a stack? (a stack = it loaded and threw inside `apply`; only `failed to import` = it threw at load time)
3. **Which line threw?** → read the stack
4. **Did the registration enter the tree?** → `Slots.listSubTree`'s `occupants`
5. **Is the new code running?** → see "a change that does not take effect" in the Guide
6. **Is it actually running?** → make one live call

**The bar for writing a conclusion**: only evidence that discriminates between causes counts. When you cannot settle it, write it as a **criterion** (tell the reader how to measure it) — or delete it.
