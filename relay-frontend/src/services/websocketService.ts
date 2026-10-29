import { Client, type IMessage } from "@stomp/stompjs";
import { WS_URL, ENABLE_ACK } from "../lib/config";
import { ackBody } from "../lib/contract";

export type ConnState = "connecting" | "connected" | "reconnecting" | "rejected";

export interface SocketHandlers {
  onState: (s: ConnState) => void;
  onMessage: (raw: unknown) => void;
  onPresence: (raw: unknown) => void;
  onError: (raw: unknown) => void;
}

const parse = (m: IMessage): unknown => {
  try { return JSON.parse(m.body); } catch { return null; }
};

export function createSocket(token: string, h: SocketHandlers) {
  const client = new Client({
    brokerURL: WS_URL,
    connectHeaders: { Authorization: `Bearer ${token}` }, // header, never the URL
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {}, // never log frames: they contain the token
    onConnect: () => {
      h.onState("connected");
      client.subscribe("/user/queue/messages", (m) => h.onMessage(parse(m)));
      client.subscribe("/topic/presence", (m) => h.onPresence(parse(m)));
      client.subscribe("/user/queue/errors", (m) => h.onError(parse(m) ?? m.body));
      client.publish({ destination: "/app/chat.pending", body: "{}" });
    },
    onWebSocketClose: () => {
      if (client.active) h.onState("reconnecting");
    },
    onStompError: () => {
      // Most likely an invalid or expired token. Stop retrying with it.
      h.onState("rejected");
      void client.deactivate();
    },
  });

  h.onState("connecting");
  client.activate();

  return {
    send(receiver: string, content: string) {
      if (!client.connected) throw new Error("Not connected");
      client.publish({ destination: "/app/chat.send", body: JSON.stringify({ receiver, content }) });
    },
    ack(messageId: string) {
      if (!ENABLE_ACK || !client.connected) return;
      client.publish({ destination: "/app/chat.ack", body: ackBody(messageId) });
    },
    close() {
      void client.deactivate();
    },
  };
}

export type ChatSocket = ReturnType<typeof createSocket>;
