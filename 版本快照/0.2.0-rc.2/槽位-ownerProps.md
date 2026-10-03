# 槽位 ownerProps 快照（`0.2.0-rc.2`）

> 中文 ｜ [English](slot-owner-props.en.md)

`Slots.listSubTree { root: "<槽位名>" }` 返回的 `catalog.ownerProps` 是**接口源码字符串**，
内容是版本数据。这里留两份当时的值，**只用来示范"它长什么样"**。

**照抄你查到的那段声明里的字段名**，不要照抄本文。

## `sidebar.workspaces.session.menu.item`（会话行 "..." 菜单的一行）

```ts
/** Owner share of one Session row action occurrence: the row the action belongs to. */
export interface SessionRowOwnerProps {
  /** Session the row shows. */
  sessionId: SessionId
  /** Row display title: persisted title, or empty when the Session has none. */
  displayTitle: string
}
```

同一次查询里，这个槽位还声明了：

- `catalog.standardProps`：`useResource` / `useWorkspaces` / `usePanelInfo` / `useSessions` /
  `useSessionStatus` / `useSessionRetainInfo`（框架统一注入）
- `catalog.hookContext`：`MenuOpenState`（owner 传进来的开合状态对）
- `catalog.slotInject`：`{ hooks: { menuOpenState, shortcuts } }`（owner 侧已声明的 hook 源）

## `conversation.session.header.actions`（会话头部标题旁的动作区）

```ts
/** Header actions derive their state from standard Session props. */
export interface ConversationHeaderActionOwnerProps {
  /** Marker field: entries receive no owner-specific values. */
  children?: never
}
```

它的 `standardProps` 更长（`useSessions` / `sessionId` / `useConversation` / `useChat` /
`useInput` / `inputActions` / `useProjection` / `useTrajectory` …），`hookContext` 为空。

## 三种把值送进组件的方式（机制，不随版本变）

| 方式 | 注册侧怎么写 | 组件里拿到什么 |
|---|---|---|
| 标准 props | 什么都不用做 | `props.sessionId`、`props.useSessions(selector)` |
| 自己的 observable | `inject: () => ({ hooks: { myState } })`，`myState` 须有 `getSnapshot` + `subscribe` | `props.useMyState(selector)` |
| owner 的 hook factory | `inject: (standard, hookContext) => ({ hooks: { menuOpenState: () => hookContext } })` | `props.useMenuOpenState()` |
