# Relay: chat frontend

React + Vite + TypeScript + Tailwind v4 + `@stomp/stompjs`, for the Spring Boot chat backend.

## Run

```bash
npm install
cp .env.example .env     # already created for you
npm run dev              # http://localhost:5173
```

Backend must be running on `http://localhost:8080`.

## Backend setup needed

- **CORS** for `POST /api/auth/*`: allow origin `http://localhost:5173` (a specific origin, not `*`).
- **WebSocket**: `registry.addEndpoint("/ws").setAllowedOrigins("http://localhost:5173")`. This client uses a native WebSocket (`ws://.../ws`), so the endpoint must **not** be SockJS-only. If you use `.withSockJS()`, either also register a plain endpoint or switch the client to SockJS.
- **STOMP auth**: a `ChannelInterceptor` must read the `Authorization` header on CONNECT, validate the JWT and set the `Principal`. Without it `/user/queue/messages` will not route to the right user.

## How it behaves

- JWT is held **in memory only**; refreshing the page signs you out. The session also ends when `expiresIn` elapses or the server rejects the STOMP CONNECT.
- The sender is never sent in `chat.send`; only `{ receiver, content }`.
- Conversations exist only for this browser session: they are built from messages received (including those from `/app/chat.pending` on connect) and messages you send. There is no history API yet.
- Online dots appear only for users the server has reported via `/topic/presence`. Nothing is faked: no delivery ticks, read receipts, typing indicators or mock data.
- Sent messages are shown immediately on the client; the UI does not claim they were delivered.
- Starting a chat: type a username in the sidebar search and press Enter (there is no user-search API).

## Payloads that must be verified (all isolated in `src/lib/contract.ts`)

The backend source was not available, so these are tolerant guesses that return `null` on unknown shapes:

| Item | Assumed | Verify in |
|---|---|---|
| Register body | `{ username, password }` | `RegisterRequest` DTO (extra fields? password rules?) |
| Incoming message | `{ id?, sender, content, timestamp? }` (also accepts `from`, `text`, `messageId`, `sentAt`, `createdAt`) | message DTO / `ChatController` |
| Presence event | `{ username, online }` or `{ username, status\|type\|event }` | presence listener |
| `/app/chat.ack` body | `{ messageId }`, disabled unless `VITE_ENABLE_ACK=true` | `ChatController` |
| Own-message echo | Assumed **not** echoed to the sender; any echo is ignored | `chat.send` handler |

## Backend endpoints/events needed for unsupported features

- `GET /api/users?query=` returns `[{ username }]` (user search)
- `GET /api/conversations` returns `[{ peer, lastMessage, lastAt, unreadCount }]`
- `GET /api/conversations/{peer}/messages?before=&limit=` (history with pagination)
- Delivery/read events, e.g. `/user/queue/receipts` with `{ messageId, status: DELIVERED|READ, at }`
- Typing: client publishes `/app/chat.typing { receiver }`; server pushes `/user/queue/typing { sender }`
- Initial presence snapshot: `GET /api/presence` (today you only see changes after you connect)
- Optional profile endpoint for the right-hand details panel (not built, since nothing real to show)

## Structure

```
src/
  lib/       config, contract (payload readers), theme
  services/  api (REST), websocketService (STOMP)
  context/   AuthContext (in-memory JWT), ChatContext (state + socket lifecycle)
  components/ ui, ChatSidebar, ChatPanel
  pages/     AuthPage (login + register), ChatPage
```
