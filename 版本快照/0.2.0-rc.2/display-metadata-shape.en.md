# The shape of display metadata (`0.2.0-rc.2`)

*English mirror of `展示元信息-形状.md`; that Chinese file is the source of truth if they disagree.* ｜ [中文](展示元信息-形状.md)

**Conclusion: `locale/<lang>.json` must be `{"meta": {"title": …, "description": …}}` (nested).**

The **flat form** that puts `title` / `description` directly at the top **is invalid**——the reader only looks at `parsed.meta`;
a flat file does not report an error, it is simply **ignored as a whole**, and the display falls back to the `name` / `description` of `package.json`.

✅ Source `dsh-app-boot/lib/index.js`, `dictionariesOf()`:

```js
const meta = parsed.meta === void 0 ? void 0 : objectOf(parsed.meta, `${file}: meta`)
dictionaries.set(id, {
  title: textOf(meta?.title, `${file}: meta.title`),
  description: textOf(meta?.description, `${file}: meta.description`),
})
```

The fallback chain of `readPluginMeta()`: a localized field is missing → the `name` (title)
and `description` of the same `package.json`; the final fallback of title is the **full module identifier**, and the final fallback of description is the empty string.

## Files in this version that really use the nested shape (sampled)

```
@deepseek-ai/dsh-client-ui-schedule/locale/en.json   {"meta":{"title":…,"description":…}}
@deepseek-ai/dsh-…（asar 内 locale/(en|zh|ja).json 全部 20 份，均为嵌套）
```

## Comparison of the two shapes

```jsonc
// ✅ 有效：读取器认这个
{ "meta": { "title": "删除会话", "description": "从会话头部或侧栏会话菜单彻底删除会话。" } }

// ❌ 无效且不报错：整份被忽略 → 显示 package.json 的 name / description
{ "title": "删除会话", "description": "从会话头部或侧栏会话菜单彻底删除会话。" }
```

## Telling the three "meta"s apart along the way

| Where it appears | Shape | Role |
|---|---|---|
| top-level `meta` of `package.json` | `{ "title": …, "description": … }` (**flat**) | the display text inlined in the manifest (optional) |
| `locale/<lang>.json` | `{ "meta": { "title": …, "description": … } }` (**nested**) | display text by language; same name as the one above but a different shape |
| top-level `icon` of `package.json` | a relative path string | the icon (≤256 KiB, relative to the manifest directory) |

**Verification criterion**: temporarily change the `description` of `package.json` to a recognizable English sentence.
If the management page shows the Chinese from your `locale/zh.json`, the nested shape was read;
if it shows that English sentence, the locale file was ignored.
