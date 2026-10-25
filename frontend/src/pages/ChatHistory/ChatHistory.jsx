import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  ChevronRight,
  Plus,
  MessageSquareText,
} from "lucide-react";

import { getConversations } from "../../services/chatService";

const ChatHistory = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("conversation");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getConversations();

      const data = Array.isArray(response) ? response : response?.results || [];

      setConversations(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load chat history. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

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

  const handleOpenConversation = (id) => {
    navigate(`/chat?conversation=${id}`);
  };

  const handleNewChat = () => {
    navigate("/chat");
  };

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Page heading */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1">Chat History</h4>
          <p className="text-secondary small mb-0">
            View and continue your previous conversations.
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center gap-2"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger flex-shrink-0"
            onClick={loadHistory}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>

          <p className="text-secondary small mt-3 mb-0">
            Loading chat history...
          </p>
        </div>
      ) : conversations.length === 0 ? (
        /* Empty state */
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <MessageSquareText size={45} className="text-primary mb-3" />

            <h5 className="fw-semibold">No conversations yet</h5>

            <p className="text-secondary mb-4">
              Your saved AI conversations will appear here.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNewChat}
            >
              <Plus size={17} className="me-2" />
              Start a New Chat
            </button>
          </div>
        </div>
      ) : (
        /* Conversation list */
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <span className="fw-semibold">Your Conversations</span>

            <span className="badge text-bg-light ms-2 fs-6 text-primary">
              {conversations.length}
            </span>
          </div>

          <div className="list-group list-group-flush">
            {conversations.map((conversation) => {
              const isActive =
                String(conversationId) === String(conversation.id);

              return (
                <div
                  key={conversation.id}
                  className={`chat-history-row list-group-item d-flex align-items-center gap-2 p-3 ${
                    isActive ? "bg-primary bg-opacity-10" : ""
                  }`}
                >
                  {/* Conversation details */}
                  <div className="d-flex align-items-center gap-3 flex-grow-1 min-w-0">
                    <div
                      className={`rounded-3 p-2 flex-shrink-0 ${
                        isActive
                          ? "bg-primary text-white"
                          : "bg-light text-primary"
                      }`}
                    >
                      <MessageSquare size={19} />
                    </div>

                    <div className="flex-grow-1 min-w-0">
                      <div
                        className={`fw-semibold text-break ${
                          isActive ? "text-primary" : "text-dark"
                        }`}
                      >
                        {conversation.title || "New Chat"}
                      </div>

                      <div className="small text-secondary mt-1">
                        {formatDate(conversation.updated_at)}
                      </div>
                    </div>
                  </div>

                  {/* Open conversation */}
                  <button
                    type="button"
                    className="text-primary btn btn-light btn-sm d-flex align-items-center justify-content-center flex-shrink-0"
                    title="Open conversation"
                    aria-label={`Open ${conversation.title || "conversation"}`}
                    onClick={() => handleOpenConversation(conversation.id)}
                  >
                    <ChevronRight size={19} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;
