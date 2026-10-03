# Install method × bare-import resolution (`0.2.0-rc.2`)

> 中文 ｜ [English](dependency-resolution.en.md)

*English mirror of `依赖解析.md`; that Chinese file is the source of truth if they disagree.* ｜ [中文](依赖解析.md)

**The conclusion first**: whether a plugin can bare-`import '@deepseek-ai/*'` depends **only on whether the plugin's real path sits under the profile directory** —
not on whether the name starts with `@deepseek-ai/`, and not on any "the specification requires zero imports" claim.

## The criterion (one command, run in the plugin directory)

```sh
node -e "console.log(require.resolve('@deepseek-ai/dsh-tools'))"
```

A printed path = the import works; `MODULE_NOT_FOUND` = it does not.

## The three install methods (measured on this machine)

| # | How it is installed | Real path | Bare import | Note |
|---|---|---|---|---|
| 1 | A workspace directory `link:`ed into the profile (the normal development case) | your workspace (e.g. `F:\...`) | ❌ `ERR_MODULE_NOT_FOUND` | **It still fails even with the dependency installed into the profile** |
| 2 | A workspace directory where you ran `pnpm install` yourself | still the workspace path | ✅ | The dependency is in the plugin's own `node_modules` |
| 3 | `pnpm pack`ed to a tarball / published to a registry / installed from git | **inside the profile's `node_modules`** | ✅ **measured working** | The real path is under the profile → the walk hits the profile's `node_modules` |

## The measurement behind case 3

A probe plugin (private, built only for this):

```json
{ "name": "@local/dep-probe-tarball", "type": "module", "main": "index.js",
  "exports": { ".": "./index.js", "./package.json": "./package.json" },
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } },
  "dependencies": { "@deepseek-ai/dsh-tools": "0.2.0-rc.2" } }
```

```js
import { defineTool } from '@deepseek-ai/dsh-tools'   // a static named import: it runs at module-load time
```

Steps: `pnpm pack` → `pnpm add file:<tgz>` (into the profile) → activate that bundle. Results:

| Observation | Value |
|---|---|
| Did the row activate | ✅ yes (no longer `failed to import`) |
| Did the tool register | ✅ `dep_probe_tarball_report` appeared in the tool table and was callable |
| What the tool reported | `static import … -> OK`, `defineTool is a function: true` |
| `import.meta.url` | `file:///C:/Users/<user>/.dsh/profiles/desktop/node_modules/@local/dep-probe-tarball/index.js` |

## Two easy misreadings

1. **`link:` does not install the linked package's dependencies** (measured in a minimal comparison: neither the consumer nor the linked package ended up with `node_modules/<dep>`, and nothing landed in `.pnpm`).
   So "I declared the dependency in package.json, therefore `install_bundle` installs it for me" **only holds for cases 2 and 3**.
2. **A dependency living in the profile does not mean a `link:`ed plugin can read it.** This is exactly the counter-intuitive part of case 1:
   even with `node_modules/@deepseek-ai/dsh-tools` present in the profile, an upward walk that starts at the workspace real path never reaches it.
   (For completeness: resolving from the profile-side junction path *does* find it — but the Host uses the plugin's real path.)

## Appendix: another silent manifest failure (hit in the same round)

**Every key of `exports` must be `.` or start with `./`.** Writing `"package.json"` (missing `./`) makes the **whole `exports` field invalid**:

- Node throws `ERR_INVALID_PACKAGE_CONFIG`;
- the Plugin Manager page shows a red **"package metadata error"** for that plugin (`Invalid package config … "exports" cannot contain some keys starting with '.' and some not.`);
- the row **never activates**.

The criterion: `node <version snapshot>/_tools/清单自检.mjs <plugin directory>` — it now names that key directly.
