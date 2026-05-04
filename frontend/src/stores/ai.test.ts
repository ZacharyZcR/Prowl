import { describe, it, expect, beforeEach } from "vitest";
import { useAIStore } from "./ai";

describe("ai store", () => {
  beforeEach(() => {
    useAIStore.setState({
      panelOpen: false,
      conversations: [],
      activeConversationId: null,
      messages: [],
      streaming: false,
    });
  });

  it("togglePanel flips panelOpen", () => {
    expect(useAIStore.getState().panelOpen).toBe(false);

    useAIStore.getState().togglePanel();
    expect(useAIStore.getState().panelOpen).toBe(true);

    useAIStore.getState().togglePanel();
    expect(useAIStore.getState().panelOpen).toBe(false);
  });

  it("addMessage appends to messages", () => {
    useAIStore
      .getState()
      .addMessage({ role: "user", content: "hello" });

    const state = useAIStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].content).toBe("hello");
    expect(state.messages[0].role).toBe("user");
  });

  it("addMessage preserves existing messages", () => {
    useAIStore.getState().addMessage({ role: "user", content: "first" });
    useAIStore
      .getState()
      .addMessage({ role: "assistant", content: "second" });

    expect(useAIStore.getState().messages).toHaveLength(2);
  });

  it("appendToLastMessage appends text to last assistant message", () => {
    useAIStore.getState().addMessage({ role: "user", content: "hi" });
    useAIStore.getState().addMessage({ role: "assistant", content: "hel" });

    useAIStore.getState().appendToLastMessage("lo world");

    const msgs = useAIStore.getState().messages;
    expect(msgs[1].content).toBe("hello world");
  });

  it("appendToLastMessage does nothing if last is not assistant", () => {
    useAIStore.getState().addMessage({ role: "user", content: "hi" });

    useAIStore.getState().appendToLastMessage("nope");

    const msgs = useAIStore.getState().messages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("hi");
  });

  it("setStreaming updates streaming state", () => {
    expect(useAIStore.getState().streaming).toBe(false);

    useAIStore.getState().setStreaming(true);
    expect(useAIStore.getState().streaming).toBe(true);

    useAIStore.getState().setStreaming(false);
    expect(useAIStore.getState().streaming).toBe(false);
  });
});
