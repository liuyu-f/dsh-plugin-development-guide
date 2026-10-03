# Version snapshot · `@deepseek-ai/dsh` `0.2.0-rc.2`

*English mirror of `README.md`; that Chinese file is the source of truth if they disagree.* ｜ [中文](README.md)

> **What this is**: the values the author **looked up on the spot** on `0.2.0-rc.2`.
>
> **It is not an interface, and not a promise.** Every name, every field, every default value in it changes with the version.
> The main text ([DSH Plugin Development Guide](../../DSH-插件开发指南.en.md)) deliberately does not write these values down; it only writes "where to look them up"——
> this folder is where those lookup results land, **use once and discard, re-look up on every upgrade**.
>
> **How to use it**: when writing code you are stuck on "what exactly is this name/field called", come here first and **take a look at what it looks like**,
> then use the inspection commands in guide §2.1 to **look it up again on your own version**. When the two disagree,
> **what you looked up wins**, and delete the outdated copy in this folder or create a new `版本快照/<new version>/`.

| File | Content | Corresponding main-text section | How to look it up again after an upgrade |
|---|---|---|---|
| [seed-table.en.md](seed-table.en.md) | module id → export that the browser `require` can resolve | §7.2 | Extract `dsh-web-frontend/dist`, search the frontend main bundle for `react-dom/client` |
| [display-metadata-shape.en.md](display-metadata-shape.en.md) | `locale/<lang>.json` must nest `meta` (flat is silently ignored) + the difference between the three "meta"s | §0.2, §6.1 | Extract `dsh-app-boot` and read `dictionariesOf()`; or change `package.json.description` once and see which one the management page shows |
| [mcp-client-fields.en.md](mcp-client-fields.en.md) | the config fields and default values of `dsh-mcp-client` | §3.6 | `Config.listConfigs { name: "@deepseek-ai/dsh-mcp-client" }` |
| [dependency-resolution.en.md](dependency-resolution.en.md) | **install method × bare-import resolution**: a `link:`ed workspace plugin cannot resolve them, a tarball/registry install into the profile can; includes the `exports` key-prefix silent failure | §9.1, §6.1 | run `node -e "console.log(require.resolve('<pkg>'))"` in the plugin directory |
| [slot-owner-props.en.md](slot-owner-props.en.md) | the ownerProps interface source code the two slots returned at the time | §7.5 | the `catalog` of `Slots.listSubTree { root: "<slot name>" }` |
| [diagnostic-text.en.md](diagnostic-text.en.md) | the verbatim output of `application` / `status` / `diagnostic` | §9.2, §10 | Cause one failure and read the `diagnostic` returned by the install |
| [_tools/asar-extract.js](_tools/asar-extract.js) | the asar extraction script (the only way to read the docs shipped with the package) | workflow §3.1 | It comes with three self-checks of its own; if it cannot read, switch to `@electron/asar` |
| [_tools/清单自检.mjs](_tools/清单自检.mjs) | the machine check after writing: path/shape/id consistency and other **silent failures** | workflow §4, guide §12.2 | Just run it; after a matching version upgrade, add rules for the new fields |
| [最小实现/demo-plugin/](最小实现/demo-plugin/) | a minimal plugin with **both halves complete**: a tool + an authenticated route + a real slot + locale fallback. **Really installed on this machine and verified live** (record in [最小实现/README.en.md](最小实现/README.en.md)) | §0, §4.4, §5, §7 | `install_bundle` it directly and verify per guide §12.2 |

**Date of evidence**: 2026-10-03 ｜ **Environment**: Windows desktop + Web, Node 24.
