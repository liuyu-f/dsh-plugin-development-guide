// demo-plugin：Client 半边（最小完整实现）
//
// 演示四件在浏览器半边最容易做错的事：
//   1. 经典模块加载器协议，`id` 必须等于 package.json 的 name（指南 §7.1）
//   2. 只 require 平台种子表里的模块；解构前核对导出存在（§7.2）
//   3. 文案：locale: NS 只给 t 座位，字典要自己注册；且 t 座位不能无条件信任（§7.4）
//   4. 浮层用 shell.overlay 槽位，不要自己 portal 到 document.body（§7.2/§7.3）
//
// 语法自检：node --check client.js（它引用 window，只查语法，不执行）
window.__ModuleLoader__.load({
  id: '@local/demo-plugin',
  factory(require) {
    const React = require('react')
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    // 解构前先确认这个版本真的导出这些名字：缺一个就是整个槽位白屏。
    const { Button, IconClockOutlineRegular, Modal } = primitives

    const SLOT = 'conversation.session.header.utilities'
    const OVERLAY_SLOT = 'shell.overlay'
    const ROW_ID = 'demo-plugin.note'
    const DIALOG_ID = 'demo-plugin.note-dialog'
    const ENDPOINT = '/__demo/notes'
    const NS = 'demoPlugin'

    // —— 文案：座位优先，但只在真的翻译出内容时 ——
    const zh = {
      'button.title': '记一条笔记',
      'dialog.title': '保存笔记',
      'dialog.name': '名称',
      'dialog.text': '内容',
      'dialog.save': '保存',
      'dialog.saving': '保存中…',
      'dialog.cancel': '取消',
      'dialog.failed': '保存失败：{reason}',
    }
    const en = {
      'button.title': 'Save a note',
      'dialog.title': 'Save note',
      'dialog.name': 'Name',
      'dialog.text': 'Text',
      'dialog.save': 'Save',
      'dialog.saving': 'Saving…',
      'dialog.cancel': 'Cancel',
      'dialog.failed': 'Save failed: {reason}',
    }

    let localeService = null

    function builtinLang() {
      if (typeof navigator === 'undefined') return 'zh'
      const tags = [].concat(navigator.languages || [], [navigator.language])
      for (const tag of tags) {
        const primary = String(tag || '').toLowerCase().split('-')[0]
        if (primary === 'zh' || primary === 'en') return primary
      }
      return 'zh'
    }

    function builtinText(key, values) {
      const dict = builtinLang() === 'en' ? en : zh
      const template = dict[key]
      if (template === undefined) return key
      if (!values) return template
      return template.replace(/\{(\w+)\}/g, (whole, name) => (name in values ? String(values[name]) : whole))
    }

    // 座位绑定的命名空间还没有字典时，translate 的兜底是「返回 key 本身」。
    // 所以：只有返回值非空且 != key 才认它，否则回落内置字典。
    function resolveText(seat, key, values) {
      if (typeof seat === 'function') {
        try {
          const text = seat(key, values)
          if (typeof text === 'string' && text !== '' && text !== key) return text
        } catch {
          /* 座位坏了也不能让文案变空 */
        }
      }
      return builtinText(key, values)
    }

    // —— 模块级请求状态：两个槽位条目（按钮 / 弹窗）共用 ——
    const listeners = new Set()
    let open = false

    function setOpen(next) {
      open = next
      for (const listener of [...listeners]) {
        try {
          listener()
        } catch {
          /* 一个订阅者坏掉不影响其它 */
        }
      }
    }

    function useOpen() {
      const [value, setValue] = React.useState(open)
      React.useEffect(() => {
        const listener = () => setValue(open)
        listeners.add(listener)
        return () => listeners.delete(listener)
      }, [])
      return value
    }

    function NoteDialog(props) {
      const t = (key, values) => resolveText(props?.t, key, values)
      const isOpen = useOpen()
      const [name, setName] = React.useState('')
      const [text, setText] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(null)

      const close = React.useCallback(() => {
        if (busy) return
        setOpen(false)
      }, [busy])

      const save = React.useCallback(() => {
        if (busy) return
        setBusy(true)
        setError(null)
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), text }),
        })
          .then(async (response) => {
            let payload = {}
            try {
              payload = await response.json()
            } catch {
              /* 非 JSON 响应体：用状态码兜底 */
            }
            if (!response.ok || payload?.ok !== true) {
              throw new Error(payload?.error || `HTTP ${response.status}`)
            }
            setBusy(false)
            setOpen(false)
          })
          .catch((reason) => {
            setBusy(false)
            setError(reason?.message ?? String(reason))
          })
      }, [busy, name, text])

      if (!isOpen) return null

      const field = (label, value, onChange) =>
        React.createElement('label', { style: fieldStyle },
          React.createElement('span', { style: labelStyle }, label),
          React.createElement('input', {
            value,
            disabled: busy,
            onChange: (event) => onChange(event.currentTarget.value),
            style: inputStyle,
          }))

      return React.createElement(Modal, {
        open: true,
        onClose: close,
        title: t('dialog.title'),
        closeLabel: t('dialog.cancel'),
        footer: [
          React.createElement(Button, { key: 'cancel', variant: 'outline', onClick: close, disabled: busy }, t('dialog.cancel')),
          React.createElement(Button, { key: 'save', variant: 'primary', onClick: save, disabled: busy }, busy ? t('dialog.saving') : t('dialog.save')),
        ],
      }, [
        React.createElement('div', { key: 'fields', style: fieldsStyle },
          field(t('dialog.name'), name, setName),
          field(t('dialog.text'), text, setText)),
        error === null
          ? null
          : React.createElement('div', { key: 'err', role: 'alert', style: errorStyle }, t('dialog.failed', { reason: error })),
      ])
    }

    const fieldsStyle = { display: 'flex', flexDirection: 'column', gap: 12 }
    const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 4 }
    const labelStyle = { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }
    // 只用 Theme.listTokens 列出的令牌（本版本 border 只到 l2；宿主自己的
    // Button.module.css 用了未公开的 l3，插件不该照抄那个名字）。
    const inputStyle = {
      padding: '6px 8px',
      borderRadius: 6,
      border: '0.5px solid var(--dsw-alias-border-l2, rgba(128,128,128,.4))',
      background: 'var(--dsw-alias-bg-layer-1, transparent)',
      color: 'var(--dsw-alias-label-primary, inherit)',
      font: 'inherit',
    }
    const errorStyle = { marginTop: 8, fontSize: 12, lineHeight: '16px', color: 'var(--dsw-alias-state-error-primary)' }

    function NoteButton(props) {
      const t = (key, values) => resolveText(props?.t, key, values)
      const label = t('button.title')
      return React.createElement(Button, {
        variant: 'ghost',
        size: 'sm',
        'aria-label': label,
        title: label,
        onClick: () => setOpen(true),
        icon: React.createElement(IconClockOutlineRegular, { size: 16 }),
      })
    }

    function apply(ctx) {
      // 字典注册：服务在就注册，注册成功后再通知一次重渲染。
      const adoptLocale = (locale) => {
        if (locale === null || locale === undefined) return
        localeService = locale
        if (typeof locale.register !== 'function') return
        ctx.effect(() => {
          const disposer = locale.register(NS, { zh, en })
          setOpen(open)
          return disposer
        }, 'demo-plugin: dictionaries')
      }
      adoptLocale(ctx.get('locale'))
      if (localeService === null) ctx.inject(['locale'], (sub) => adoptLocale(sub.locale))

      // locale: NS 无条件声明：座位是否可用不影响注册，组件自己有兜底。
      ctx.slots.inject(SLOT, () => ctx.slots.register({
        name: SLOT,
        id: ROW_ID,
        order: 40,
        locale: NS,
      }, NoteButton))

      ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register({
        name: OVERLAY_SLOT,
        id: DIALOG_ID,
        order: 100,
        locale: NS,
      }, NoteDialog))
    }

    // slots 是硬依赖；locale 是软依赖（没有它就只用内置字典）。
    return { apply, inject: ['slots'] }
  },
})
