import api from "./api";

// Get the user's saved conversations
export const getConversations = async () => {
  const response = await api.get("chats/");
  return response.data;
};

// Get one conversation and its messages
export const getConversation = async (conversationId) => {
  const response = await api.get(`chats/${conversationId}/`);
  return response.data;
};

// Ask a question, optionally continuing an existing conversation
export const sendMessage = async (query, conversationId = null) => {
  const response = await api.post("rag/search/", {
    query,
    conversation_id: conversationId,
  });

  return response.data;
};

// Delete one conversation
export const deleteConversation = async (conversationId) => {
  const response = await api.delete(`chats/${conversationId}/`);
  return response.data;
};
