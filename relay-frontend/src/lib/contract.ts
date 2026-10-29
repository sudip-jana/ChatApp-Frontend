/**
 * Single place where backend payload shapes are interpreted.
 *
 * VERIFY AGAINST THE JAVA DTOs. The shapes for incoming messages, presence events and
 * acknowledgements were not available when this frontend was written, so the readers below
 * are deliberately tolerant and return null when a payload is not recognised. Once you
 * confirm the real DTOs, tighten these functions and delete the guesses.
 */
export interface ChatMessage {
  id: string;
  peer: string;
  from: "me" | "them";
  content: string;
  at: number;
}

export interface IncomingMessage {
  id: string | null; // server message id, needed for chat.ack
  sender: string;
  content: string;
  at: number;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

export function readIncoming(raw: unknown): IncomingMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sender = str(r.sender) ?? str(r.from);
  const content = str(r.content) ?? str(r.text);
  if (!sender || !content) return null;
  const id = r.id ?? r.messageId;
  const ts = r.timestamp ?? r.sentAt ?? r.createdAt;
  const at = typeof ts === "string" || typeof ts === "number" ? new Date(ts).getTime() : NaN;
  return {
    id: id == null ? null : String(id),
    sender,
    content,
    at: Number.isFinite(at) ? at : Date.now(),
  };
}

export function readPresence(raw: unknown): { username: string; online: boolean } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const username = str(r.username) ?? str(r.user);
  if (!username) return null;
  if (typeof r.online === "boolean") return { username, online: r.online };
  const s = str(r.status) ?? str(r.type) ?? str(r.event);
  if (s) return { username, online: /^(online|connected|join|joined)$/i.test(s) };
  return null;
}

/** Error pushed to /user/queue/errors (UNVERIFIED contract): a plain string, or { message } / { error }. */
export function readError(raw: unknown): string | null {
  if (typeof raw === "string") return raw.trim() || null;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    return str(r.message) ?? str(r.error);
  }
  return null;
}

/** Ack payload is UNVERIFIED. Adjust to match ChatController before enabling VITE_ENABLE_ACK. */
export const ackBody = (messageId: string) =>
    /^\d+$/.test(messageId) ? messageId : JSON.stringify(messageId);

export interface HistoryPage {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * GET /api/messages/with/{peer} → { messages, nextCursor, hasMore }.
 * Returns null for a malformed response, so the UI shows an error instead of an empty chat.
 */
export function readHistory(raw: unknown, me: string, peer: string): HistoryPage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.messages) || typeof r.hasMore !== "boolean") return null;

  const messages: ChatMessage[] = [];
  for (const item of r.messages) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    const sender = str(m.sender);
    const receiver = str(m.receiver);
    const content = typeof m.content === "string" ? m.content : null;
    if (m.id == null || !sender || !receiver || content === null) continue;
    const mine = sender === me;
    if ((mine ? receiver : sender) !== peer) continue; // never show another conversation's message here
    const at = new Date(String(m.createdAt)).getTime();
    messages.push({ id: String(m.id), peer, from: mine ? "me" : "them", content, at: Number.isFinite(at) ? at : 0 });
  }

  const nextCursor = r.nextCursor == null ? null : String(r.nextCursor);
  return { messages, nextCursor, hasMore: r.hasMore && nextCursor !== null };
}