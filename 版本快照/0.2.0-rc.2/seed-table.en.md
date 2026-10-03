# Seed table (`0.2.0-rc.2` snapshot)

*English mirror of `种子表.md`; that Chinese file is the source of truth if they disagree.* ｜ [中文](种子表.md)

In the browser, `require` resolves only to this platform seed table, frozen when the shell starts.

## The members found at the time

| Module id | Description |
|---|---|
| `react` | React runtime |
| `react/jsx-runtime` | JSX runtime (not needed when writing `createElement` by hand) |
| `react-dom` | ReactDOM |
| `react-dom/client` | `createRoot` (**the probe's anchor**: the table is right next to it) |
| `@deepseek-ai/cordis` | Cordis runtime |
| `@deepseek-ai/dsh-client-store` | client observable store |
| `@deepseek-ai/dsh-client-ui-slots` | slot core |
| `@deepseek-ai/dsh-client-ui-primitives` | host controls (the implicit baseline external of the dynamic module package) |
| `@deepseek-ai/dsh-client-ui-dockkit` | dock-related controls |

## How to look it up again on your own version

```sh
# 1) 解前端的 dist（见 _tools/asar-extract.js）
node _tools/asar-extract.js "<安装目录>/resources/app.asar" \
  "/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist" "_ref/web-frontend-dist"

# 2) 种子表是主 bundle 里一个 id → 模块 的对象字面量，用锚点搜出来
grep -o 'react-dom/client[^}]*}' _ref/web-frontend-dist/assets/index-*.js | head -c 1200
```

**Do not use the table above as an interface**: adding/removing members is the part of this table that changes most often.
In this version `ui-primitives` is in the table (it is the implicit external of the dynamic module package), but that does not guarantee it is still there in the next version——
what is truly stable is only the three steps "**look up the table first, then destructure, and check that the export exists before destructuring**".

## Do not mix up the other table

`Builtin.listBuiltins` lists the injections available to the **`cordis-client-runner` closure** (the lane where the agent dynamically writes UI):
`ctx` / `React` / `host` / `styles` / `console`.
That is the measure of the third lane, and **it is not the same thing as the seed table**.
