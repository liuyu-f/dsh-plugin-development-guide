# Minimal implementation: `demo-plugin`

*English mirror of `最小实现/README.md`; that Chinese file is the source of truth if they disagree.* ｜ [中文](README.md)

A minimal plugin that is **complete in both halves, installable and visible**. Its reason to exist is to be the "copy this starting point",
not to have you assemble fragments from scratch. The four places that are easiest to get wrong are all pointed at guide sections in the code comments:

| Location | Mechanism demonstrated | Guide |
|---|---|---|
| top of `index.js` | **zero `@deepseek-ai/*` imports**, every service is taken from `ctx` | §9.1 |
| `index.js` `rejectUnauthenticated` | a self-built route **authenticates on its first line**, fails closed, reads the service per request | §4.4 |
| `index.js` `ctx.tools.register` | style B (hand-written JSON Schema) → **the registry does not validate parameters**, `execute` guards itself | §5.1, §5.2 |
| `index.js` `saveNote` | **one implementation per operation**, called by both the tool and the route | §5.5 |
| `client.js` `resolveText` | `locale: NS` gives only `t`; **when the seat has no translation it falls back to the built-in dictionary** | §7.4 |
| `client.js` `shell.overlay` | the overlay goes through the slot, **it does not portal itself to `document.body`** | §7.2, §7.3 |
| `client.js` `inputStyle` | only uses the `--dsw-alias-*` listed by `Theme.listTokens` | §7.3 |
| `package.json` | minimal manifest set: `main` + `exports` + `dsh.bundle` + `dsh.client` | §6.1 |

## What it looks like once installed

- The session header action area gains one more icon button: clicking it pops up a "save note" dialog (through `shell.overlay`);
- The dialog POSTs to `/__demo/notes` (with authentication);
- The agent gains one more tool `demo_note_save`: `{ name, text }` saves, and giving only `{ name }` lists the existing notes;
- Notes land in `$DSH_HOME/demo-plugin/<name>.txt`.

## How to install it and how to verify it

```
plugin_manager { action: "install_bundle", target: "<absolute path of this directory>" }
```

Then walk the gradient of guide §12.2: `application: "applied"` + `warnings: []` →
the `status` of `Config.listConfigs { name: "@local/demo-plugin" }` should be `absent` (no `Config` export) →
in `Slots.listSubTree { root: "conversation.session.header.utilities" }` you should see
`demo-plugin.note` with `active: true` → a credential-less `POST /__demo/notes` should get **401 + your own JSON** →
refresh the page and click the button.

> ⚠️ This is a snapshot of `0.2.0-rc.2`: slot names, primitive export names and token names may all change in a new version.
> When landing your own plugin, **look up every name in it again with inspection**.

> **These files carry no attribution and need none.** They only show what a minimal, business-agnostic skeleton looks like,
> and anyone following the specification would write something similar. **Take it, change it, ship it — no credit required.**
> What asks for a credit is this **document** (see the license section of the repository's root `README.md`), not this example code.

## Verification record (`0.2.0-rc.2`, really installed on this machine)

This implementation **was really installed and debugged**, it is not paper code:

| Step | Result |
|---|---|
| post-write machine check `_tools/清单自检.mjs` | `OK @local/demo-plugin: 清单自检通过` |
| `install_bundle` | `application: "applied"`, `warnings: []` |
| `Config.listConfigs { name }` | `status: "absent"` (no `Config` export = the expected shape) |
| whether the tool entered the caller's tool table | `demo_note_save` ✅ (the host half really did register it) |
| live call (valid parameters) | `saved verify-01 (52 bytes) at <DSH_HOME>/demo-plugin/verify-01.txt` —— it really landed on disk |
| live call (name only) | `notes:` + `verify-01` —— the list branch works |
| live call (invalid parameter: a Chinese name) | `save failed: invalid note name: "验证-第一次"` —— **an error result rather than an exception**, the shape is correct |
| `remove_bundle` | `application: "applied"`, no warning; the profile manifest is cleanly restored, the test data has been cleared |
