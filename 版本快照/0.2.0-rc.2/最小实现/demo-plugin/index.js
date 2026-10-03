// demo-plugin：Host 半边（最小完整实现）
//
// 演示四件在 profile 插件里最容易做错的事：
//   1. 零 @deepseek-ai/* import —— 一切服务从 ctx 取（指南 §9.1）
//   2. 手写 JSON Schema 注册工具 → execute 里自己校验参数（§5.2）
//   3. 自建 HTTP 路由 → 第一行就是鉴权，且失败关闭（§4.4）
//   4. 一个操作一份实现，工具与路由共调（§5.5）
//
// 语法自检：node --check index.js
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const name = 'demo-plugin'

// 硬依赖只写真正缺了就不该启动的服务。其余一律软依赖（ctx.inject）。
export const inject = ['tools']

const ROUTE_PATH = '/__demo/notes'

class DemoError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'DemoError'
    this.status = status
  }
}

// 行 config 原样到达这里（本包不导出 Config）：防御性读，给默认值。
function notesDir(config) {
  const configured = typeof config?.notesDir === 'string' ? config.notesDir.trim() : ''
  if (configured) return configured
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  return path.join(home, 'demo-plugin')
}

// 文件名只允许安全字符：把外部输入变成路径前必须先约束形态。
const NOTE_NAME = /^[A-Za-z0-9._-]{1,64}$/

// —— 唯一的一份实现：两个调用者（工具 / 路由）都调它 ——
function saveNote(ctx, config, name, text) {
  if (typeof name !== 'string' || !NOTE_NAME.test(name)) {
    throw new DemoError(`invalid note name: ${JSON.stringify(name)}`, 400)
  }
  if (typeof text !== 'string' || text.length === 0) {
    throw new DemoError('note text must be a non-empty string', 400)
  }
  const dir = notesDir(config)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${name}.txt`)
  fs.writeFileSync(file, text, 'utf8')
  return { name, file, bytes: Buffer.byteLength(text) }
}

function listNotes(config) {
  const dir = notesDir(config)
  let entries = []
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return []
  }
  return entries.filter((entry) => entry.endsWith('.txt')).map((entry) => entry.slice(0, -4))
}

// —— HTTP 助手 ——
function sendJson(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
  })
  res.end(text)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 1e6) req.destroy()
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
    req.on('aborted', () => reject(new Error('aborted')))
  })
}

// —— 鉴权：失败关闭，逐请求读服务，放在读 body 之前 ——
function rejectUnauthenticated(ctx, req) {
  const connection = ctx.get('connection')
  if (connection === undefined || connection === null) return 401
  if (typeof connection.requestRejection !== 'function') return 401
  try {
    const rejection = connection.requestRejection({ headers: req.headers })
    return rejection === 401 || rejection === 403 ? rejection : undefined
  } catch {
    return 403
  }
}

export function apply(ctx, config) {
  // 软依赖：一条注册路径同时覆盖"现在有"和"以后才有"。
  // 不要写 ctx.get 快路径 + ctx.inject 兜底两条分支（effect 会挂在不同 ctx 上）。
  ctx.inject(['webServer'], (sub) => {
    const webServer = sub.webServer
    sub.effect(() => webServer.register({
      kind: 'exact',
      path: ROUTE_PATH,
      handler: async (req, res) => {
        const rejection = rejectUnauthenticated(ctx, req)
        if (rejection !== undefined) {
          sendJson(res, rejection, { ok: false, error: 'unauthenticated request' })
          return
        }
        if (req.method === 'GET') {
          sendJson(res, 200, { ok: true, notes: listNotes(config) })
          return
        }
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'method not allowed' })
          return
        }
        let args = {}
        try {
          const raw = await readBody(req)
          if (raw) args = JSON.parse(raw)
        } catch {
          sendJson(res, 400, { ok: false, error: 'bad json body' })
          return
        }
        try {
          const saved = saveNote(ctx, config, args?.name, args?.text)
          sendJson(res, 200, { ok: true, ...saved })
        } catch (error) {
          const status = error instanceof DemoError && error.status ? error.status : 500
          sendJson(res, status, { ok: false, error: String(error?.message ?? error) })
        }
      },
    }), 'demo-plugin: notes route')
  })

  // 工具：写法 B（手写 JSON Schema）。注册表不会替你校验参数 → execute 自己防。
  ctx.tools.register({
    name: 'demo_note_save',
    description: 'Save one named note as a text file in this harness home, or list existing note names. There is no undo for overwriting an existing note.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string', description: 'Note name: letters, digits, dot, dash, underscore (1-64 chars).' },
        text: { type: 'string', description: 'Note body. Omit to list notes instead of saving.' },
      },
      required: ['name'],
    },
    output: {
      schema: { type: 'string' },
      render(_args, value) {
        return [{ type: 'text', text: String(value) }]
      },
    },
    async execute(args) {
      // 参数形态自己判：错误类型可能直接进来（指南 §5.2）。
      const name = typeof args?.name === 'string' ? args.name.trim() : ''
      if (name.length === 0) throw new TypeError('invalid arguments: "name" must be a non-empty string')
      const text = args?.text
      if (text === undefined || text === null || text === '') {
        const notes = listNotes(config)
        return notes.length === 0 ? 'no notes yet' : `notes:\n${notes.join('\n')}`
      }
      if (typeof text !== 'string') throw new TypeError('invalid arguments: "text" must be a string when present')
      try {
        const saved = saveNote(ctx, config, name, text)
        return `saved ${saved.name} (${saved.bytes} bytes) at ${saved.file}`
      } catch (error) {
        // 执行期失败 → 返回文本报告（不是 throw），调用方能读到发生了什么。
        return `save failed: ${String(error?.message ?? error)}`
      }
    },
  })
}
