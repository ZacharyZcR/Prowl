import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Bot, X, Send, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAIStore } from "@/stores/ai";
import {
  useLoadConversations,
  useCreateConversation,
  useLoadMessages,
  useDeleteConversation,
  sendMessage,
} from "@/hooks/useAI";

export function AICopilot() {
  const { t } = useTranslation();
  const {
    panelOpen,
    togglePanel,
    conversations,
    activeConversationId,
    messages,
    streaming,
  } = useAIStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useLoadConversations();
  const createConversation = useCreateConversation();
  const loadMessages = useLoadMessages();
  const deleteConversation = useDeleteConversation();

  // load conversations when panel opens
  useEffect(() => {
    if (panelOpen) {
      loadConversations().catch((error) => {
        toast.error(error instanceof Error ? error.message : t("common.loadFailed"));
      });
    }
  }, [panelOpen, loadConversations, t]);

  // load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId != null) {
      loadMessages(activeConversationId).catch((error) => {
        toast.error(error instanceof Error ? error.message : t("common.loadFailed"));
      });
    }
  }, [activeConversationId, loadMessages, t]);

  // auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = useCallback(async () => {
    try {
      await createConversation(t("ai.newChat"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.operationFailed"));
    }
  }, [createConversation, t]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteConversation(id);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("common.operationFailed"));
      }
    },
    [deleteConversation, t],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    try {
      setInput("");

      let convId = activeConversationId;
      if (convId == null) {
        convId = await createConversation(t("ai.newChat"));
      }
      sendMessage(convId, text);
    } catch (error) {
      setInput(text);
      toast.error(error instanceof Error ? error.message : t("common.operationFailed"));
    }
  }, [input, streaming, activeConversationId, createConversation, t]);

  return (
    <>
      {/* Floating action button */}
      <button
        className="stc-ai-fab"
        onClick={togglePanel}
        type="button"
        aria-label={t("ai.title")}
      >
        <Bot size={24} />
      </button>

      {/* Panel via portal */}
      {panelOpen &&
        createPortal(
          <div className="stc-ai-overlay" onClick={togglePanel}>
            <div
              className="stc-ai-panel"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="stc-ai-panel__header">
                <span className="stc-ai-panel__title">{t("ai.title")}</span>
                <div className="stc-ai-panel__header-actions">
                  <button
                    className="stc-icon-btn"
                    onClick={handleNewChat}
                    type="button"
                    title={t("ai.newChat")}
                    aria-label={t("ai.newChat")}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    className="stc-icon-btn"
                    onClick={togglePanel}
                    type="button"
                    title={t("common.close")}
                    aria-label={t("common.close")}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Conversation list */}
              {conversations.length > 0 && (
                <div className="stc-ai-convs">
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      className={`stc-ai-conv${c.id === activeConversationId ? " stc-ai-conv--active" : ""}`}
                      onClick={() =>
                        useAIStore.getState().setActiveConversation(c.id)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          useAIStore.getState().setActiveConversation(c.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={c.id === activeConversationId}
                    >
                      <span className="stc-ai-conv__title">{c.title}</span>
                      <button
                        className="stc-ai-conv__del"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c.id);
                        }}
                        title={t("common.delete")}
                        aria-label={`${t("common.delete")} ${c.title}`}
                        type="button"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Messages */}
              <div className="stc-ai-panel__messages">
                {messages.length === 0 ? (
                  <div className="stc-ai-panel__welcome">
                    <Bot size={40} />
                    <p>{t("ai.welcome")}</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={msg.id ?? `${msg.role}-${msg.created_at ?? i}-${i}`}
                      className={`stc-ai-msg stc-ai-msg--${msg.role}`}
                    >
                      <div className="stc-ai-msg__content">
                        {msg.content ||
                          (streaming && i === messages.length - 1
                            ? t("ai.thinking")
                            : "")}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="stc-ai-panel__input">
                <input
                  className="stc-ai-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !streaming) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t("ai.placeholder")}
                  disabled={streaming}
                />
                <button
                  className="stc-ai-send"
                  onClick={handleSend}
                  disabled={streaming || !input.trim()}
                  type="button"
                  title={t("ai.send")}
                  aria-label={t("ai.send")}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
