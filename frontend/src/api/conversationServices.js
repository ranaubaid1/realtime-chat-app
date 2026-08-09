import api from "../services/api";

export const createConversation = async (receiverId, phoneNumber) => {
  const response = await api.post("/conversations", {
    receiverId,
    phoneNumber,
  });

  return response.data;
};

// Get all conversations of logged-in user
export const getConversations = async () => {
  const response = await api.get("/conversations");

  return response.data;
};