import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, MessageCircle, SendHorizontal } from "lucide-react";
import { useChat } from "../context/ChatContext";
import type { ConnState } from "../services/websocketService";
import { Avatar, IconButton } from "./ui";
import { fmtTime } from "./ChatSidebar";

const connText: Record<ConnState, string | null> = {
  connected: null,
  connecting: "Connecting…",
  reconnecting: "Connection lost. Reconnecting…",
  rejected: "Your session is no longer valid. Sign in again.",
};

export default function ChatPanel() {
  const { active, conn, online, close, send, loadOlder } = useChat();
  const [draft, setDraft] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const prevHeight = useRef<number | null>(null); // scrollHeight before older messages were added

  const count = active?.messages.length ?? 0;
  const lastId = active?.messages.at(-1)?.id;
  const peer = active?.peer;
  const loaded = active?.loaded;
  const loading = active?.loading ?? false;

  // Jump to the newest message when a chat opens, finishes its first load, or receives a new message.
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [lastId, peer, loaded]);

  // After older messages are prepended, keep the viewport where it was.
  useLayoutEffect(() => {
    const el = box.current;
    if (!loading && el && prevHeight.current !== null) {
      el.scrollTop += el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
    }
  }, [count, loading]);

  // If the first page doesn't fill the screen there is nothing to scroll, so keep loading.
  useEffect(() => {
    const el = box.current;
    if (el && active && active.loaded && active.hasMore && !active.loading && !active.error && el.scrollHeight <= el.clientHeight) {
      prevHeight.current = el.scrollHeight;
      void loadOlder(active.peer);
    }
  }, [active, loadOlder]);

  useEffect(() => { setDraft(""); }, [peer]);

  if (!active) {
    return (
        <section className="hidden flex-1 flex-col items-center justify-center gap-3 bg-bg text-center md:flex">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sunken text-brand"><MessageCircle size={26} /></span>
          <h2 className="text-lg font-semibold">Choose a conversation</h2>
          <p className="max-w-xs text-sm text-muted">Select a chat on the left, or type a username in the search box to message someone new.</p>
        </section>
    );
  }

  const banner = connText[conn];
  const status = online[active.peer];

  function onScroll() {
    const el = box.current;
    if (!el || !active || !active.loaded || !active.hasMore || active.loading || active.error) return;
    if (el.scrollTop < 80) {
      prevHeight.current = el.scrollHeight;
      void loadOlder(active.peer);
    }
  }
  function submit() {
    if (active && send(active.peer, draft)) setDraft("");
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  return (
      <section className="flex min-w-0 flex-1 flex-col bg-bg">
        <header className="flex items-center gap-3 border-b border-line bg-surface px-3 py-3 md:px-5">
          <span className="md:hidden"><IconButton label="Back to conversations" onClick={close}><ArrowLeft size={20} /></IconButton></span>
          <Avatar name={active.peer} online={status} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{active.peer}</div>
            <div className="text-xs text-muted">{status === undefined ? "" : status ? "Online" : "Offline"}</div>
          </div>
        </header>

        {banner && <div role="status" className="bg-sunken px-4 py-2 text-center text-xs font-medium">{banner}</div>}

        <div ref={box} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-4 md:px-8">
          {active.loading && <p className="py-2 text-center text-xs text-muted">{active.loaded ? "Loading older messages…" : "Loading messages…"}</p>}
          {active.error && (
              <p className="py-2 text-center text-xs text-danger">
                {active.error}{" "}
                <button onClick={() => void loadOlder(active.peer)} className="font-semibold underline">Retry</button>
              </p>
          )}
          {active.loaded && !active.hasMore && count > 0 && <p className="py-2 text-center text-xs text-muted">Start of conversation</p>}
          {count === 0 && active.loaded && !active.loading && !active.error && <p className="mt-10 text-center text-sm text-muted">No messages yet. Say hello to {active.peer}.</p>}
          <ul className="mx-auto flex max-w-2xl flex-col gap-1.5">
            {active.messages.map((m) => {
              const mine = m.from === "me";
              return (
                  <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] shadow-sm ${mine ? "rounded-br-md bg-brand text-brand-ink" : "rounded-bl-md border border-line bg-surface"}`}>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <time className={`mt-0.5 block text-right text-[11px] ${mine ? "opacity-70" : "text-muted"}`}>{fmtTime(m.at)}</time>
                    </div>
                  </li>
              );
            })}
          </ul>
          <div ref={end} />
        </div>

        <div className="border-t border-line bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder={conn === "connected" ? "Write a message" : "Waiting for connection…"}
              aria-label="Message"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-bg px-4 py-2.5 text-[15px] outline-none focus:border-brand"
          />
            <button
                onClick={submit}
                disabled={conn !== "connected" || !draft.trim()}
                aria-label="Send message"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-brand-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <SendHorizontal size={18} />
            </button>
          </div>
        </div>
      </section>
  );
}