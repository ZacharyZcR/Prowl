import { create } from "zustand";

interface Conversation {
  id: number;
  title: string;
  model: string;
  created_at: string;
}

interface Message {
  id?: number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}

interface AIState {
  panelOpen: boolean;
  conversations: Conversation[];
  activeConversationId: number | null;
  messages: Message[];
  streaming: boolean;

  togglePanel: () => void;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: number | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  appendToLastMessage: (text: string) => void;
  setStreaming: (streaming: boolean) => void;
}

export const useAIStore = create<AIState>((set) => ({
  panelOpen: false,
  conversations: [],
  activeConversationId: null,
  messages: [],
  streaming: false,

  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  appendToLastMessage: (text) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + text };
      }
      return { messages: msgs };
    }),
  setStreaming: (streaming) => set({ streaming }),
}));
