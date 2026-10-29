import { useState } from "react";
import { LogOut, MessageCircle, Moon, Search, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { toggleTheme } from "../lib/theme";
import { Avatar, IconButton } from "./ui";

export const fmtTime = (t: number) => new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(t);

export default function ChatSidebar() {
  const { logout } = useAuth();
  const { me, conversations, active, online, open } = useChat();
  const [q, setQ] = useState("");
  const query = q.trim();
  const shown = conversations.filter((c) => c.peer.toLowerCase().includes(query.toLowerCase()));
  const exact = conversations.some((c) => c.peer.toLowerCase() === query.toLowerCase());

  return (
    <aside className={`${active ? "hidden md:flex" : "flex"} w-full flex-col border-r border-line bg-surface md:w-80 lg:w-96`}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand text-brand-ink"><MessageCircle size={16} /></span>
        <span className="flex-1 text-lg font-bold tracking-tight">Relay</span>
        <IconButton label="Toggle dark mode" onClick={toggleTheme}>
          <Sun size={18} className="hidden dark:block" /><Moon size={18} className="dark:hidden" />
        </IconButton>
        <IconButton label="Sign out" onClick={logout}><LogOut size={18} /></IconButton>
      </div>

      <div className="px-4 pb-3">
        <label className="flex items-center gap-2 rounded-xl bg-sunken px-3 py-2.5 text-sm">
          <Search size={16} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && query) { open(query); setQ(""); } }}
            placeholder="Search chats or enter a username"
            className="w-full bg-transparent outline-none placeholder:text-muted"
            aria-label="Search chats or enter a username"
          />
        </label>
      </div>

      <ul className="flex-1 overflow-y-auto px-2">
        {query && !exact && query !== me && (
          <li>
            <button onClick={() => { open(query); setQ(""); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-sunken">
              <Avatar name={query} />
              <span className="text-sm">Message <b>{query}</b></span>
            </button>
          </li>
        )}
        {shown.map((c) => {
          const last = c.messages.at(-1);
          return (
            <li key={c.peer}>
              <button onClick={() => open(c.peer)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-sunken ${active?.peer === c.peer ? "bg-sunken" : ""}`}>
                <Avatar name={c.peer} online={online[c.peer]} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{c.peer}</span>
                    {last && <span className="shrink-0 text-xs text-muted">{fmtTime(last.at)}</span>}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-muted">{last ? `${last.from === "me" ? "You: " : ""}${last.content}` : "No messages yet"}</span>
                    {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs font-bold text-brand-ink">{c.unread}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {!query && conversations.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-muted">
            No conversations yet. Type a username above and press Enter to start one.
          </li>
        )}
      </ul>

      <div className="flex items-center gap-3 border-t border-line px-4 py-3">
        <Avatar name={me || "?"} size={34} />
        <div className="min-w-0 text-sm"><div className="truncate font-semibold">{me}</div><div className="text-xs text-muted">Signed in</div></div>
      </div>
    </aside>
  );
}
