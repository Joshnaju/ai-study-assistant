import api from "./api";

export const generateMCQ = async (documentId, questionCount) => {
  const response = await api.post("mcq/", {
    document_id: documentId,
    number_of_questions: Number(questionCount),
  });
  return response.data;
};
