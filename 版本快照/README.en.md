# Version snapshots

> 中文 ｜ [English](README.en.md)

*English mirror of `README.md`; that Chinese file is the source of truth if they disagree.* ｜ [中文](README.md)

This folder holds **values queried on the spot on one version**. The main text ([DSH Plugin Development Guide](../DSH-插件开发指南.en.md)) deliberately does not write those values down; it only writes "where to look them up" —
this directory is where those lookup results land.

**How to use it**: when writing code you are stuck on "what exactly is this name/field called", open the matching version and take a look, then **look it up again on your own version**;
when the two disagree, what you looked up wins.

| Directory | Baseline runtime | What is inside |
|---|---|---|
| [0.2.0-rc.2/](0.2.0-rc.2/) | `@deepseek-ai/dsh@0.2.0-rc.2` (Windows desktop + Web) | the seed table, the display-metadata shape, ownerProps, MCP fields, diagnostic text, the extraction and machine-check scripts, and **a minimal plugin verified by a real install** |

**Archiving a new version** (after upgrading DSH):

1. Copy the previous version's directory (`0.2.0-rc.2/` → `<new version>/`); **do not edit the old one in place** — an old snapshot is how someone else diagnoses a historical problem;
2. Re-gather the evidence following each file's "how to look it up again after an upgrade" column, and replace the values;
3. Update the table above and each version's `README.md`;
4. Run `node <new version>/_tools/docs-integrity.mjs ..` (link targets and Chinese/English mirror pairing).

> This is an **archive of query results**, **not an interface and not a promise**; `_ref/` is what holds "the reference implementation you are copying right now".
> Both are discard-after-use; only the archiving differs.
