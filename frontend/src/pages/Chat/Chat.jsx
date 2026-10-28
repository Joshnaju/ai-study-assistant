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
  UserRound,
  Bot,
  FileText,
} from "lucide-react";

import {
  getConversations,
  getConversation,
  sendMessage,
  deleteConversation,
} from "../../services/chatService";

import "./Chat.css";
import InteractiveMCQ from "../../components/InteractiveMCQ";

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

  if (filename.endsWith(".txt")) return "Text document";
  if (filename.endsWith(".docx")) return "Word document";
  if (filename.endsWith(".pdf")) return "PDF document";

  return "Document";
}

function formatDate(dateString) {
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
}

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

  const fetchConversations = useCallback(async () => {
    try {
      const data = await getConversations();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : [];

      setConversations(list);
    } catch (err) {
      console.error(
        "Chat history API failed:",
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

      const savedMessages = (data.messages || []).map((message, index) => {
        const mcqs = message.mcqs || [];

        return {
          id: message.id ?? `saved-${index}`,
          role: message.role,
          content:
            message.role === "assistant" && mcqs.length > 0
              ? "Here are your practice questions. Select one answer for each question."
              : message.content,
          sources: message.sources || [],
          web_sources: message.web_sources || [],
          mcqs,
        };
      });

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

    // Display the user's message immediately.
    setMessages((previous) => [
      ...previous,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: query,
        sources: [],
        web_sources: [],
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
          content:
            data.mcqs?.length > 0
              ? "Here are your practice questions. Select one answer for each question."
              : data.answer || "No answer was returned.",
          sources: data.results || [],
          web_sources: data.web_sources || [],
          mcqs: data.mcqs || [],
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

  const handleDeleteConversation = async () => {
    if (!deleteTarget || deleteLoading) return;

    setDeleteLoading(true);

    try {
      await deleteConversation(deleteTarget.id);

      setConversations((previous) =>
        previous.filter((chat) => String(chat.id) !== String(deleteTarget.id)),
      );

      if (String(conversationId) === String(deleteTarget.id)) {
        handleNewChat();
      }

      setDeleteTarget(null);
    } catch (err) {
      console.error(
        "Error deleting conversation:",
        err.response?.data || err.message,
      );

      setError("Failed to delete conversation. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleSources = (messageKey) => {
    setExpandedSources((previous) => ({
      ...previous,
      [messageKey]: !previous[messageKey],
    }));
  };

  return (
    <div className="study-chat container-fluid p-0 d-flex flex-column">
      {/* Chat header */}
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap bg-white border-bottom px-3 px-md-4 py-3">
        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            className="btn btn-light border d-flex align-items-center justify-content-center"
            onClick={() => setHistoryOpen((open) => !open)}
            title={historyOpen ? "Hide history" : "Show history"}
            aria-label={historyOpen ? "Hide history" : "Show history"}
          >
            {historyOpen ? (
              <PanelLeftClose size={19} className="text-primary" />
            ) : (
              <PanelLeftOpen size={19} className="text-primary" />
            )}
          </button>

          <div>
            <h5 className="fw-bold mb-1" style={{ color: "#142A40" }}>
              Study Assistant
            </h5>
            <p className="small text-secondary mb-0">
              Ask questions about your uploaded documents
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={handleNewChat}
          disabled={loading}
        >
          <Plus size={17} />
          New Chat
        </button>
      </div>

      {/* Main chat layout */}
      <div className="chat-layout d-flex flex-grow-1">
        {/* Chat history sidebar */}
        {historyOpen && (
          <aside className="chat-history bg-white border-end p-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold mb-0">Chat History</h6>
              <span className="badge text-bg-light border">
                {conversations.length}
              </span>
            </div>

            <button
              type="button"
              className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2 mb-3"
              onClick={handleNewChat}
              disabled={loading}
            >
              <Plus size={16} />
              New conversation
            </button>

            <div className="chat-history-list">
              {historyLoading ? (
                <div className="text-secondary small text-center py-4">
                  <span className="spinner-border spinner-border-sm me-2" />
                  Loading history...
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center text-secondary py-4">
                  <MessageSquare size={25} className="mb-2" />
                  <p className="small mb-0">No conversations yet</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`chat-history-item d-flex align-items-center rounded-3 mb-2 ${
                      String(conversationId) === String(conversation.id)
                        ? "active bg-primary bg-opacity-10"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="btn flex-grow-1 text-start d-flex align-items-start gap-2 py-2 px-2 border-0"
                      onClick={() => handleOpenConversation(conversation.id)}
                      disabled={loading}
                    >
                      <MessageSquare
                        size={15}
                        className="mt-1 flex-shrink-0 text-primary"
                      />

                      <span className="chat-history-item-text">
                        <span className="d-block small fw-semibold text-dark">
                          {conversation.title || "New Chat"}
                        </span>

                        <span className="d-block text-secondary chat-date">
                          {formatDate(conversation.updated_at)}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm border-0 text-danger me-1 chat-delete-btn"
                      title="Delete conversation"
                      aria-label="Delete conversation"
                      onClick={() => setDeleteTarget(conversation)}
                      disabled={deleteLoading}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Conversation area */}
        <main className="chat-main flex-grow-1 d-flex flex-column">
          <div className="chat-messages flex-grow-1 p-3 p-md-4">
            {messages.length === 0 && !loading && (
              <div className="text-center text-secondary chat-welcome">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary mb-3"
                  style={{ width: 60, height: 60 }}
                >
                  <MessageSquare size={28} />
                </div>

                <h5 className="fw-bold text-dark">
                  What would you like to learn?
                </h5>

                <p className="small mx-auto chat-welcome-description">
                  Ask a question about your uploaded study documents to get an
                  answer with sources.
                </p>
              </div>
            )}

            {/* Individual chat messages */}
            {messages.map((message, index) => {
              const messageKey = message.id ?? index;
              const isUser = message.role === "user";

              const sources = isUser
                ? []
                : getUniqueSources(message.sources || []);

              const webSources = isUser ? [] : message.web_sources || [];

              const isExpanded = Boolean(expandedSources[messageKey]);

              return (
                <div
                  key={messageKey}
                  className={`chat-message-row d-flex gap-2 gap-md-3 mb-4 ${
                    isUser ? "user-row" : "assistant-row"
                  }`}
                >
                  {/* User / AI avatar */}
                  <div
                    className={`chat-avatar rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                      isUser
                        ? "bg-primary bg-opacity-10 text-primary"
                        : "text-white"
                    }`}
                    style={
                      isUser
                        ? { width: 38, height: 38 }
                        : {
                            width: 38,
                            height: 38,
                            backgroundColor: "#142A40",
                          }
                    }
                    title={isUser ? "You" : "AI Assistant"}
                  >
                    {isUser ? <UserRound size={20} /> : <Bot size={20} />}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`chat-message-bubble rounded-4 p-3 ${
                      isUser
                        ? "user-bubble bg-primary bg-opacity-10"
                        : "assistant-bubble bg-white border"
                    }`}
                  >
                    <div className="chat-message-content">
                      {isUser ? (
                        <div className="text-dark">{message.content}</div>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      )}
                    </div>

                    {/* Interactive MCQs generated by the chat agent */}
                    {!isUser && message.mcqs?.length > 0 && (
                      <InteractiveMCQ questions={message.mcqs} />
                    )}

                    {/* Web sources from OpenAI web search */}
                    {!isUser && webSources.length > 0 && (
                      <div className="border-top mt-3 pt-3">
                        <h6 className="fw-semibold mb-2">Web sources</h6>

                        <ul className="list-unstyled mb-0">
                          {webSources.map((source, sourceIndex) => (
                            <li
                              key={source.url || `web-source-${sourceIndex}`}
                              className="mb-2"
                            >
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-decoration-none text-break"
                                >
                                  {source.title || source.url}
                                  <i className="bi bi-box-arrow-up-right ms-1" />
                                </a>
                              ) : (
                                <span className="text-secondary small">
                                  {source.title || "Web source"}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Uploaded document sources */}
                    {!isUser && sources.length > 0 && (
                      <div className="border-top mt-3 pt-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center gap-2"
                          onClick={() => toggleSources(messageKey)}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronDown size={17} />
                          ) : (
                            <ChevronRight size={17} />
                          )}

                          <FileText size={16} />

                          <span>Sources ({sources.length})</span>
                        </button>

                        {isExpanded && (
                          <div className="mt-3 d-flex flex-column gap-2">
                            {sources.map((source, sourceIndex) => {
                              const filename =
                                source.filename ||
                                source.file_name ||
                                "Untitled document";

                              return (
                                <div
                                  className="d-flex align-items-start gap-2 rounded-3 bg-light p-2"
                                  key={`${
                                    source.document_id ?? filename
                                  }-${sourceIndex}`}
                                >
                                  <i
                                    className={`bi ${getFileIconClass(
                                      filename,
                                    )} fs-5`}
                                  />

                                  <div className="min-w-0">
                                    <div className="small fw-semibold text-break">
                                      {filename}
                                    </div>

                                    <div className="small text-secondary">
                                      {getSourceDescription(source)}
                                    </div>
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

            {/* Assistant loading indicator */}
            {loading && (
              <div className="chat-message-row assistant-row d-flex gap-2 gap-md-3 mb-4">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: "#142A40",
                  }}
                >
                  <Bot size={20} />
                </div>

                <div className="bg-white border rounded-4 p-3 text-secondary small">
                  <span className="spinner-border spinner-border-sm me-2" />
                  Preparing your answer...
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div
                className="alert alert-danger d-flex align-items-start gap-2"
                role="alert"
              >
                <i className="bi bi-exclamation-circle mt-1" />

                <div className="flex-grow-1">{error}</div>

                <button
                  type="button"
                  className="btn-close"
                  aria-label="Dismiss error"
                  onClick={() => setError("")}
                />
              </div>
            )}
          </div>

          {/* Message input */}
          <form
            className="chat-input-area bg-white border-top p-3 p-md-4"
            onSubmit={handleSubmit}
          >
            <div className="chat-input-wrapper d-flex align-items-end gap-2 rounded-4 border bg-white p-2">
              <textarea
                className="form-control border-0 shadow-none"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask something about your documents..."
                rows={1}
                aria-label="Your question"
                disabled={loading}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />

              <button
                type="submit"
                className="btn btn-primary d-flex align-items-center justify-content-center flex-shrink-0"
                disabled={loading || !question.trim()}
                aria-label="Send message"
                title="Send message"
                style={{ width: 42, height: 42 }}
              >
                <Send size={18} />
              </button>
            </div>

            <p className="text-center text-secondary small mt-2 mb-0">
              AI-generated answers may not always be accurate. Verify important
              information against your documents and web sources.
            </p>
          </form>
        </main>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="chat-modal-backdrop d-flex align-items-center justify-content-center p-3"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleteLoading) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            className="bg-white rounded-4 shadow p-4 w-100 chat-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-chat-title"
          >
            <div className="d-flex align-items-start justify-content-between mb-3">
              <div>
                <h5 id="delete-chat-title" className="fw-bold mb-2">
                  Delete Conversation?
                </h5>

                <p className="text-secondary small mb-0">
                  Are you sure you want to delete{" "}
                  <strong>{deleteTarget.title || "this conversation"}</strong>?
                  <span className="d-block text-muted fw-semibold fst-italic mt-2">
                    This action cannot be undone.
                  </span>
                </p>
              </div>
            </div>

            <div className="d-flex justify-content-center gap-2 mt-4">
              <button
                type="button"
                className="btn btn-danger d-flex align-items-center gap-2"
                onClick={handleDeleteConversation}
                disabled={deleteLoading}
              >
                {deleteLoading && (
                  <span className="spinner-border spinner-border-sm" />
                )}

                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;
