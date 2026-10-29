import { X } from "lucide-react";
import { useChat } from "../context/ChatContext";

export default function Notice() {
    const { notice, dismissNotice } = useChat();
    if (!notice) return null;
    return (
        <div role="alert" className="fixed left-1/2 top-4 z-50 flex w-[min(92vw,26rem)] -translate-x-1/2 items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-lg">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-danger" aria-hidden />
            <p className="flex-1">{notice}</p>
            <button onClick={dismissNotice} aria-label="Dismiss" className="rounded-lg p-0.5 text-muted hover:text-ink"><X size={16} /></button>
        </div>
    );
}