# Slot ownerProps snapshot (`0.2.0-rc.2`)

*English mirror of `槽位-ownerProps.md`; that Chinese file is the source of truth if they disagree.* ｜ [中文](槽位-ownerProps.md)

The `catalog.ownerProps` returned by `Slots.listSubTree { root: "<slot name>" }` is **interface source code as a string**;
its content is version data. Two values from that time are kept here, **only to demonstrate "what it looks like"**.

**Copy the field names from the declaration you looked up**, do not copy this document.

## `sidebar.workspaces.session.menu.item` (one row of the "..." menu of a session row)

```ts
/** Owner share of one Session row action occurrence: the row the action belongs to. */
export interface SessionRowOwnerProps {
  /** Session the row shows. */
  sessionId: SessionId
  /** Row display title: persisted title, or empty when the Session has none. */
  displayTitle: string
}
```

In the same query, this slot also declared:

- `catalog.standardProps`: `useResource` / `useWorkspaces` / `usePanelInfo` / `useSessions` /
  `useSessionStatus` / `useSessionRetainInfo` (injected uniformly by the framework)
- `catalog.hookContext`: `MenuOpenState` (the open/closed state pair passed in by the owner)
- `catalog.slotInject`: `{ hooks: { menuOpenState, shortcuts } }` (the hook sources already declared on the owner side)

## `conversation.session.header.actions` (the action area beside the session header title)

```ts
/** Header actions derive their state from standard Session props. */
export interface ConversationHeaderActionOwnerProps {
  /** Marker field: entries receive no owner-specific values. */
  children?: never
}
```

Its `standardProps` is longer (`useSessions` / `sessionId` / `useConversation` / `useChat` /
`useInput` / `inputActions` / `useProjection` / `useTrajectory` …), and `hookContext` is empty.

## Three ways to send values into a component (mechanism, does not change with the version)

| Way | What to write on the registration side | What the component gets |
|---|---|---|
| Standard props | nothing to do | `props.sessionId`, `props.useSessions(selector)` |
| Your own observable | `inject: () => ({ hooks: { myState } })`, and `myState` must have `getSnapshot` + `subscribe` | `props.useMyState(selector)` |
| The owner's hook factory | `inject: (standard, hookContext) => ({ hooks: { menuOpenState: () => hookContext } })` | `props.useMenuOpenState()` |
