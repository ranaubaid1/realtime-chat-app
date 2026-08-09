import api from "../services/api";

// ===============================
// Send Text / Image / File / Audio
// ===============================
export const sendMessage = async (
  conversationId,
  text = "",
  file = null
) => {
  const formData = new FormData();

  formData.append(
    "conversationId",
    conversationId
  );

  if (text) {
    formData.append("text", text);
  }

  if (file) {
    formData.append("file", file);
  }

  const response = await api.post(
    "/messages",
    formData
  );

  return response.data;
};


// ===============================
// Get Messages
// ===============================
export const getMessages = async (
  conversationId
) => {
  const response = await api.get(
    `/messages/${conversationId}`
  );

  return response.data;
};


// ===============================
// Reply Message
// ===============================
export const replyMessage = async (
  conversationId,
  replyTo,
  text
) => {
  const response = await api.post(
    "/messages/reply",
    {
      conversationId,
      replyTo,
      text,
    }
  );

  return response.data;
};


// ===============================
// Edit Message
// ===============================
export const editMessage = async (
  messageId,
  text
) => {
  const response = await api.put(
    `/messages/edit/${messageId}`,
    { text }
  );

  return response.data;
};


// ===============================
// Delete For Me
// ===============================
export const deleteForMe = async (
  messageId
) => {
  const response = await api.put(
    `/messages/delete-me/${messageId}`
  );

  return response.data;
};


// ===============================
// Delete For Everyone
// ===============================
export const deleteForEveryone = async (
  messageId
) => {
  const response = await api.put(
    `/messages/delete-everyone/${messageId}`
  );

  return response.data;
};


// ===============================
// Reaction
// ===============================
export const addReaction = async (
  messageId,
  emoji
) => {
  const response = await api.put(
    `/messages/reaction/${messageId}`,
    { emoji }
  );

  return response.data;
};


// ===============================
// Star
// ===============================
export const starMessage = async (
  messageId
) => {
  const response = await api.put(
    `/messages/star/${messageId}`
  );

  return response.data;
};


// ===============================
// Pin
// ===============================
export const pinMessage = async (
  messageId
) => {
  const response = await api.put(
    `/messages/pin/${messageId}`
  );

  return response.data;
};


// ===============================
// Forward
// ===============================
export const forwardMessage = async (
  messageId,
  conversationId
) => {
  const response = await api.post(
    `/messages/forward/${messageId}`,
    {
      conversationId,
    }
  );

  return response.data;
};


// ===============================
// Seen
// ===============================
export const markAsSeen = async (
  messageId
) => {
  const response = await api.put(
    `/messages/seen/${messageId}`
  );

  return response.data;
};


// ===============================
// Delivered
// ===============================
export const markAsDelivered = async (
  messageId
) => {
  const response = await api.put(
    `/messages/delivered/${messageId}`
  );

  return response.data;
};