import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  ChevronDown,
  ChevronRight,
  Trash2,
} from "lucide-react";
import "./Chat.css";
import {
  getConversations,
  getConversation,
  sendMessage,
  deleteConversation,
} from "../../services/chatService";

function getUniqueSources(sources = []) {
  const unique = new Map();

  sources.forEach((source) => {
    const key =
      source.document_id != null
        ? `doc-${source.document_id}`
        : source.filename || source.file_name || "unknown";

    if (!unique.has(key)) {
      unique.set(key, source);
    }
  });

  return Array.from(unique.values());
}

function getFileIconClass(filename = "") {
  const file = filename.toLowerCase();

  if (file.endsWith(".pdf")) {
    return "bi-file-earmark-pdf-fill text-danger";
  }

  if (file.endsWith(".docx")) {
    return "bi-file-earmark-word-fill text-primary";
  }

  if (file.endsWith(".txt")) {
    return "bi-file-earmark-text-fill text-success";
  }

  return "bi-file-earmark-fill text-secondary";
}

function getSourceDescription(source) {
  if (source.page_number != null) {
    return `Page ${source.page_number}`;
  }

  const filename = (source.filename || source.file_name || "").toLowerCase();

  if (filename.endsWith(".txt")) {
    return "Text document";
  }

  if (filename.endsWith(".docx")) {
    return "Word document";
  }

  return "Document";
}

const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

function Chat() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [error, setError] = useState("");
  const [expandedSources, setExpandedSources] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteConversation = async () => {
    if (!deleteTarget || deleteLoading) return;

    setDeleteLoading(true);

    try {
      await deleteConversation(deleteTarget.id);

      // Remove only the deleted conversation from history
      setConversations((prev) =>
        prev.filter((chat) => String(chat.id) !== String(deleteTarget.id)),
      );

      // If the deleted conversation is currently open, start a new chat
      if (String(conversationId) === String(deleteTarget.id)) {
        handleNewChat();
      }

      setDeleteTarget(null);
    } catch (error) {
      console.error(
        "Error deleting conversation:",
        error.response?.data || error.message,
      );
      setError("Failed to delete conversation. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchConversations = useCallback(async () => {
    console.log("Fetching chat history...");

    try {
      const data = await getConversations();

      console.log("Chat history API response:", data);

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : [];

      setConversations(list);
    } catch (err) {
      console.error(
        "Chat history API failed:",
        err.response?.status,
        err.response?.data || err.message,
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setQuestion("");
    setError("");
    setExpandedSources({});
  };

  const handleOpenConversation = async (id) => {
    if (loading) return;

    setError("");

    try {
      const data = await getConversation(id);

      setConversationId(data.id);

      const savedMessages = (data.messages || []).map((message, index) => ({
        id: message.id ?? `saved-${index}`,
        role: message.role,
        content: message.content,
        sources: message.sources || [],
      }));

      setMessages(savedMessages);
      setExpandedSources({});
    } catch (err) {
      console.error("Failed to open conversation:", err);
      setError("Unable to open this conversation. Please try again.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const query = question.trim();

    if (!query || loading) return;

    setError("");

    // Display the user's question immediately.
    setMessages((previous) => [
      ...previous,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: query,
        sources: [],
      },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const data = await sendMessage(query, conversationId);

      if (data.conversation_id != null) {
        setConversationId(data.conversation_id);
      }

      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.answer || "No answer was returned.",
          sources: data.results || [],
        },
      ]);

      await fetchConversations();
    } catch (err) {
      console.error("Failed to send message:", err);

      setError(
        err.response?.data?.error ||
          "Unable to get an answer. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleSources = (messageKey) => {
    setExpandedSources((previous) => ({
      ...previous,
      [messageKey]: !previous[messageKey],
    }));
  };

  return (
    <div className="study-chat">
      <div className="chat-page-header">
        <div className="chat-page-title">
          <button
            type="button"
            className="chat-icon-button history-toggle"
            onClick={() => setHistoryOpen((open) => !open)}
            title={historyOpen ? "Hide history" : "Show history"}
            aria-label={historyOpen ? "Hide history" : "Show history"}
          >
            {historyOpen ? (
              <PanelLeftClose size={19} />
            ) : (
              <PanelLeftOpen size={19} />
            )}
          </button>

          <div>
            <h4>Study Assistant</h4>
            <p>Ask questions about your uploaded documents</p>
          </div>
        </div>

        <button
          type="button"
          className="chat-new-button"
          onClick={handleNewChat}
          disabled={loading}
        >
          <Plus size={17} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="chat-layout">
        {historyOpen && (
          <aside className="chat-history">
            <div className="chat-history-heading">
              <h6>Chat History</h6>
              <span>{conversations.length}</span>
            </div>

            <button
              type="button"
              className="chat-history-new"
              onClick={handleNewChat}
              disabled={loading}
            >
              <Plus size={17} />
              New conversation
            </button>

            <div className="chat-history-list">
              {historyLoading ? (
                <div className="chat-history-empty">Loading history...</div>
              ) : conversations.length === 0 ? (
                <div className="chat-history-empty">
                  <MessageSquare size={23} />
                  <p>No conversations yet</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`chat-history-item ${
                      String(conversationId) === String(conversation.id)
                        ? "active"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="chat-history-open-btn"
                      onClick={() => handleOpenConversation(conversation.id)}
                      disabled={loading}
                    >
                      <MessageSquare size={17} />

                      <span className="chat-history-item-text">
                        <span className="chat-history-item-title">
                          {conversation.title || "New Chat"}
                        </span>

                        <span className="conversation-date">
                          {formatDate(conversation.updated_at)}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      className="delete-conversation-btn"
                      title="Delete conversation"
                      onClick={() => setDeleteTarget(conversation)}
                      disabled={deleteLoading}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        <main className="chat-main">
          <div className="chat-messages">
            {messages.length === 0 && !loading && (
              <div className="chat-welcome">
                <div className="chat-welcome-icon">
                  <MessageSquare size={28} />
                </div>

                <h5>What would you like to learn?</h5>

                <p>
                  Ask a question about your uploaded study documents to get an
                  answer with sources.
                </p>
              </div>
            )}

            {messages.map((message, index) => {
              const messageKey = message.id ?? index;
              const isUser = message.role === "user";
              const sources = isUser
                ? []
                : getUniqueSources(message.sources || []);

              const isExpanded = Boolean(expandedSources[messageKey]);

              return (
                <div
                  key={messageKey}
                  className={`chat-message-row ${
                    isUser ? "user-row" : "assistant-row"
                  }`}
                >
                  <div
                    className={`chat-message-bubble ${
                      isUser ? "user-bubble" : "assistant-bubble"
                    }`}
                  >
                    <div className="chat-message-content">
                      {isUser ? (
                        <div className="user-message-text">
                          {message.content}
                        </div>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      )}
                    </div>

                    {!isUser && sources.length > 0 && (
                      <div className="chat-sources">
                        <button
                          type="button"
                          className="chat-sources-toggle"
                          onClick={() => toggleSources(messageKey)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronDown size={17} />
                          ) : (
                            <ChevronRight size={17} />
                          )}

                          <i className="bi bi-journal-text"></i>

                          <span>Sources ({sources.length})</span>
                        </button>

                        {isExpanded && (
                          <div className="chat-source-files">
                            {sources.map((source, sourceIndex) => {
                              const filename =
                                source.filename ||
                                source.file_name ||
                                "Untitled document";

                              return (
                                <div
                                  className="chat-source-file"
                                  key={`${source.document_id ?? filename}-${sourceIndex}`}
                                >
                                  <i
                                    className={`bi ${getFileIconClass(
                                      filename,
                                    )}`}
                                  ></i>

                                  <div className="chat-source-file-info">
                                    <span className="chat-source-filename">
                                      {filename}
                                    </span>

                                    <span className="chat-source-description">
                                      {getSourceDescription(source)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="chat-message-row assistant-row">
                <div className="chat-message-bubble assistant-bubble chat-loading">
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-text">Preparing your answer...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="chat-error" role="alert">
                <i className="bi bi-exclamation-circle me-2"></i>
                {error}
              </div>
            )}
          </div>

          <form className="chat-input-area" onSubmit={handleSubmit}>
            <div className="chat-input-wrapper">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask something about your documents..."
                rows={1}
                aria-label="Your question"
                disabled={loading}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />

              <button
                type="submit"
                className="chat-send-button"
                disabled={loading || !question.trim()}
                aria-label="Send message"
                title="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </main>
      </div>

      {/* Delete selected conversation confirmation popup */}
      {deleteTarget && (
        <div
          className="chat-confirm-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleteLoading) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            className="chat-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-chat-title"
          >
            <h3 id="delete-chat-title">Delete Conversation?</h3>
            <p>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.title || "this conversation"}</strong>?
              This action cannot be undone.
            </p>

            <div className="chat-confirm-actions">
              <button
                type="button"
                className="chat-cancel-btn"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-btn"
                onClick={handleDeleteConversation}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

export default Chat;
