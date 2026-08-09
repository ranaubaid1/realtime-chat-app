import api from "../services/api";
export const createConversation = async (receiverId) => {
  const response = await api.post("/conversations", {
    receiverId,
  });

  return response.data;
};

// Get all conversations of logged-in user
export const getConversations = async () => {
  const response = await api.get("/conversations");

  return response.data;
};