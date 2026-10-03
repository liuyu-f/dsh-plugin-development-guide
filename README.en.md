# DSH Plugin Development Guide (package)

> 中文 ｜ [English](README.en.md)

_English mirror of `README.md`; that Chinese file is the source of truth if they disagree._ ｜ [中文](README.md)

Written for people who want to **build plugins on DeepSeek Harness**: from "I have an idea" to "the plugin really runs and ships".

Baseline runtime: `@deepseek-ai/dsh` **0.2.0-rc.2** (Windows desktop + Web).

## What to read first

| File                                                        | What it is                                                                                                                      | When to read it                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [DSH Plugin Development Guide](DSH-插件开发指南.en.md)      | **Mechanisms and criteria**: manifest, patch, slots, tools, routes, locale, destructive operations, troubleshooting, acceptance | While writing code                                             |
| [DSH Plugin Development Workflow](DSH-插件开发工作流.en.md) | **The order of actions**: frame → evidence → copy a reference → write → install → verify → close out                            | Once, **before you start**                                     |
| [版本快照/](版本快照/README.en.md)                          | **Values queried on one version**: seed table, ownerProps, diagnostic text, and **a minimal plugin verified by a real install** | When you are stuck on "what exactly is this name/field called" |

Both documents ship with an English mirror (`*.en.md`). **Chinese is the source**: where the two disagree, Chinese wins.

**The shortest path**: read the workflow once (~300 lines) → take `版本快照/0.2.0-rc.2/最小实现/demo-plugin/` as your starting point, install it and get it running
→ then reshape it into your plugin following the guide's sections.

## How these documents are written

- **The body contains only things that do not change with the version** (mechanisms, contracts, criteria, the order of actions, trade-offs with a cost);
  anything that drifts with the version goes into `版本快照/<version>/` and the body keeps only "where to look it up".
  The reason is guide §2.2 — hardcoding a table that will expire is worse than omitting it.
- Every conclusion carries an evidence marker: ✅ measured on this machine ｜ 📖 bundled docs/source ｜ ⚠️ risk note.
- **No "uncertain" entries are kept**: anything unclear is either deleted or given a criterion that settles it.
- The methodology (how to tell an "observation" from a "conclusion", and the mistakes documentation most easily makes) is in guide §14 and workflow §8 —
  those two sections are worth reading even if you never write a DSH plugin.

## In-repository self-checks

```sh
# 1) Documentation integrity: are all relative links valid, are the Chinese/English mirrors paired
node 版本快照/0.2.0-rc.2/_tools/docs-integrity.mjs .

# 2) Manifest self-check: point it at your own plugin directory (catches silent path/shape/consistency failures)
node 版本快照/0.2.0-rc.2/_tools/清单自检.mjs <your plugin directory>

# 3) Extract the bundled docs and frontend artifacts (things inside asar that ordinary commands cannot read)
node 版本快照/0.2.0-rc.2/_tools/asar-extract.js "<install dir>/resources/app.asar" \
     "/dsh/node_modules/@deepseek-ai/dsh-client-ui-workspace" "_ref/ui-workspace"
```

## Maintaining the version snapshots

After upgrading DSH: **copy** the previous version's directory to `<new version>/` (do not edit the old one in place — it is how someone else diagnoses a historical problem),
re-gather the evidence following each file's "how to look it up again after an upgrade" column, then update the index table and run the documentation self-check.
Details in [版本快照/README.md](版本快照/README.md).

## License

[MIT](LICENSE)
