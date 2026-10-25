import api from "./api";

// Upload a document
export const uploadDocument = async (file, title = "") => {
  const formData = new FormData();

  formData.append("file", file);

  if (title.trim()) {
    formData.append("title", title.trim());
  }

  const response = await api.post("documents/", formData);

  return response.data;
};

// Get all documents belonging to the logged-in user
export const getDocuments = async () => {
  const response = await api.get("documents/");

  return response.data;
};

// Delete a document
export const deleteDocument = async (documentId) => {
  const response = await api.delete(`documents/${documentId}/`);

  return response.data;
};
