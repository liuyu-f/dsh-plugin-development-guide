# Diagnostic text and Config shape snapshot (`0.2.0-rc.2`)

*English mirror of `诊断文案.md`; that Chinese file is the source of truth if they disagree.* ｜ [中文](诊断文案.md)

**The text changes, the mechanism does not.** When troubleshooting, first locate it by the "cause" column of guide §10; this file is only for checking "whether yours is the same sentence".

## Verbatim output inside the install return

| Scenario | Verbatim output (this version) |
|---|---|
| Module **resolution** fails (thrown in the `_init` stage; with zero imports it is usually top-level code or `Config` validation) | `dsh: warning: 1 entry did not activate` + `<行id> (<包名>): failed to import` (**no stack**, it is a fallback text) |
| Module loads successfully, throws inside `apply()` | the same first line as above + `<行id> (<包名>): TypeError: …` + **full stack** (`at <your function>`) |
| A hand-written `Config` that "looks like Standard Schema" (a plain object, not native schemastery) | `TypeError: Cannot read properties of undefined (reading 'validate')` + stack (`resolveConfig` → `Fiber._resolveConfig` → `Fiber._reload`) |
| `install_bundle` again while already installed | `{"stage":"install", … "error":{"code":"ambiguous-install"}}` (**not a failure, there is no change to commit**) |
| An unauthenticated request hitting your own route | the `401` your own handler returns + your own JSON (e.g. `{"ok":false,"error":"unauthenticated request"}`) |

## `status` of `Config.listConfigs`

✅ Source `dsh-tool-cordis` `0.2.0-rc.2`, `liveConfig()`:

| `status` | Meaning |
|---|---|
| `schema` | the module has been imported and a **native** `Config` was read (`Config[Symbol.for('schemastery')] === true` and it carries `type` / `meta`) |
| `inactive` | the row exists but is not activated |
| `absent` | there is **no** `Config` export (the shape recommended by this guide) |
| `unsupported` | there **is** a `Config` but the shape is wrong → the settings page cannot render a form |
| `tree` | the row is a group / subtree, not a plugin |

> New versions may add values. **When you meet a status you do not recognize**, treat it as "the module is loaded but something else is wrong",
> and go read `liveConfig()` of that version (search for this name in `dsh-tool-cordis`).

## Environment facts noted along the way

- The desktop log directory `%APPDATA%\@deepseek-ai\dsh-desktop\logs` **exists but is empty** →
  `logger` output cannot be seen, so "a failure must let people know" must be folded into the report returned to the caller.
- After `remove_bundle`, `Config.listConfigs { name }` returns an **empty directory** (the row really left the Loader tree).
- On Windows, after uninstall the **junction of `node_modules/<scope>/<name>` may remain** (pnpm cleanup behavior, harmless).
