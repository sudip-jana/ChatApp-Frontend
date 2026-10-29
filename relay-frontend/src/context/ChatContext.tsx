import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { createSocket, type ChatSocket, type ConnState } from "../services/websocketService";
import { ApiError, chatApi } from "../services/api";
import { readError, readHistory, readIncoming, readPresence, type ChatMessage } from "../lib/contract";

const PAGE = 30;

export interface Conversation {
  peer: string;
  messages: ChatMessage[];
  unread: number;
  loaded: boolean;        // first page fetched
  hasMore: boolean;       // older messages exist
  cursor: string | null;  // nextCursor from the server, sent back as beforeId
  loading: boolean;
  error: string | null;   // last history error, shown with a Retry button
}

interface ChatValue {
  me: string;
  conn: ConnState;
  conversations: Conversation[];
  active: Conversation | null;
  online: Record<string, boolean>;
  notice: string | null;
  dismissNotice: () => void;
  open: (peer: string) => void;
  close: () => void;
  send: (peer: string, content: string) => boolean;
  loadOlder: (peer: string) => Promise<void>;
}

const ChatCtx = createContext<ChatValue | null>(null);

const blank = (peer: string): Conversation => ({
  peer, messages: [], unread: 0, loaded: false, hasMore: true, cursor: null, loading: false, error: null,
});

/** Merge by id, sorted by time. A local optimistic copy is dropped once the server's copy arrives. */
function merge(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const ids = new Set(existing.map((m) => m.id));
  const fresh = incoming.filter((m) => !ids.has(m.id));
  const kept = existing.filter(
      (m) => !(m.id.startsWith("local-") && fresh.some((f) => f.from === "me" && f.content === m.content && Math.abs(f.at - m.at) < 120_000)),
  );
  return [...kept, ...fresh].sort((a, b) => a.at - b.at);
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { token, username, logout } = useAuth();
  const me = username ?? "";
  const [conn, setConn] = useState<ConnState>("connecting");
  const [convs, setConvs] = useState<Record<string, Conversation>>({});
  const [online, setOnline] = useState<Record<string, boolean>>({});
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  const convsRef = useRef<Record<string, Conversation>>({});
  const inflight = useRef(new Set<string>());
  const socket = useRef<ChatSocket | null>(null);

  useEffect(() => { activeRef.current = activePeer; }, [activePeer]);
  useEffect(() => { convsRef.current = convs; }, [convs]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const upsert = useCallback((peer: string, msg: ChatMessage, unread: boolean) => {
    setConvs((prev) => {
      const c = prev[peer] ?? blank(peer);
      if (c.messages.some((m) => m.id === msg.id)) return prev;
      return { ...prev, [peer]: { ...c, messages: merge(c.messages, [msg]), unread: unread ? c.unread + 1 : c.unread } };
    });
  }, []);

  // One realtime socket for the whole session.
  useEffect(() => {
    if (!token) return;
    const s = createSocket(token, {
      onState: setConn,
      onMessage: (raw) => {
        const m = readIncoming(raw);
        if (!m || m.sender === me) return; // ignore any server echo of our own sends
        upsert(m.sender, { id: m.id ?? `in-${m.sender}-${m.at}-${m.content.length}`, peer: m.sender, from: "them", content: m.content, at: m.at }, activeRef.current !== m.sender);
        if (m.id) s.ack(m.id);
      },
      onPresence: (raw) => {
        const p = readPresence(raw);
        if (p) setOnline((prev) => ({ ...prev, [p.username]: p.online }));
      },
      onError: (raw) => setNotice(readError(raw) ?? "Something went wrong with your last message."),
    });
    socket.current = s;
    return () => { s.close(); socket.current = null; };
  }, [token, me, upsert]);

  useEffect(() => { if (conn === "rejected") logout(); }, [conn, logout]);

  /**
   * First call for a peer loads the latest page (no beforeId).
   * Later calls send beforeId = the cursor from the previous response.
   * Results are written under that peer's key only, so switching chats can't mix messages up.
   */
  const loadOlder = useCallback(async (peer: string) => {
    if (!token || inflight.current.has(peer)) return;
    const c = convsRef.current[peer];
    if (c?.loaded && (!c.hasMore || c.cursor === null)) return;
    const beforeId = c?.loaded ? c.cursor : null;

    inflight.current.add(peer);
    setConvs((p) => ({ ...p, [peer]: { ...(p[peer] ?? blank(peer)), loading: true, error: null } }));
    try {
      const page = readHistory(await chatApi.history(token, peer, beforeId, PAGE), me, peer);
      if (!page) throw new Error("Unexpected response from the server.");
      setConvs((p) => {
        const cur = p[peer] ?? blank(peer);
        return {
          ...p,
          [peer]: { ...cur, messages: merge(cur.messages, page.messages), loaded: true, loading: false, error: null, cursor: page.nextCursor, hasMore: page.hasMore },
        };
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { logout(); return; }
      // Keep whatever is already on screen; only flag the error so the UI can offer Retry.
      const msg = e instanceof Error ? e.message : "Couldn't load messages.";
      setConvs((p) => ({ ...p, [peer]: { ...(p[peer] ?? blank(peer)), loading: false, error: msg } }));
    } finally {
      inflight.current.delete(peer);
    }
  }, [token, me, logout]);

  const open = useCallback((peer: string) => {
    const name = peer.trim();
    if (!name) return;
    if (name === me) { setNotice("You can't start a chat with yourself."); return; }
    setConvs((p) => ({ ...p, [name]: { ...(p[name] ?? blank(name)), unread: 0 } }));
    setActivePeer(name);
    if (!convsRef.current[name]?.loaded) void loadOlder(name);
  }, [me, loadOlder]);

  const send = useCallback((peer: string, content: string) => {
    const text = content.trim();
    if (!text || !socket.current) return false;
    try { socket.current.send(peer, text); } catch { return false; }
    upsert(peer, { id: `local-${crypto.randomUUID()}`, peer, from: "me", content: text, at: Date.now() }, false);
    return true;
  }, [upsert]);

  const value = useMemo<ChatValue>(() => {
    const conversations = Object.values(convs).sort((a, b) => (b.messages.at(-1)?.at ?? 0) - (a.messages.at(-1)?.at ?? 0));
    return {
      me, conn, conversations,
      active: activePeer ? convs[activePeer] ?? null : null,
      online, notice,
      dismissNotice: () => setNotice(null),
      open, close: () => setActivePeer(null), send, loadOlder,
    };
  }, [me, conn, convs, activePeer, online, notice, open, send, loadOlder]);

  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatCtx);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}