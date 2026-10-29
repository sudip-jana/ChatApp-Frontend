import { ChatProvider } from "../context/ChatContext";
import ChatSidebar from "../components/ChatSidebar";
import ChatPanel from "../components/ChatPanel";
import Notice from "../components/Notice";

export default function ChatPage() {
    return (
        <ChatProvider>
            <div className="flex h-dvh overflow-hidden">
                <ChatSidebar />
                <ChatPanel />
                <Notice />
            </div>
        </ChatProvider>
    );
}