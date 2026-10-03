# DSH Plugin Development Guide

For writing plugins on the **official DeepSeek Harness desktop app** (`@deepseek-ai/dsh`, Windows desktop + Web — one runtime).
**Two documents, and you can start.**

| Document | What it is |
|---|---|
| [Workflow](workflow.en.md) | **Read before you start**: seven stages, from framing the task to verifying and closing out; plus a six-step bisection for when you are stuck |
| [Guide](guide.en.md) | **Keep open while coding**: mental model, manifest and composition, config, tools, HTTP routes, UI, state, copy, install and troubleshooting |

Chinese originals: [工作流.md](工作流.md) ｜ [指南.md](指南.md). **Chinese is the source**; where the two disagree, Chinese wins.

## Two disciplines

1. **Look names up, never guess them**: slot names, prop names, method names, export names — query every one with `cordis_inspect_query` before writing it.
   A wrong name does not fail loudly: a blank slot, or a silent no-op.
2. **When you cannot settle something, write a criterion, not a conclusion.** Telling the reader how to measure it themselves beats a sentence that says "it may be like this".

## What this documentation deliberately omits

- **Version data**: slot lists, theme-token lists, package export lists, one package's field defaults — all of it changes with the version.
  The body gives the command that queries it; look the value up on the spot.
- **"This approach is wrong" narratives**: when something really bites, you get **one rule** (for example, `exports` keys must start with `./`),
  never the history of the mistake — so readers spend their effort on the rule, not on memorising what the trap looked like.

## License

MIT
