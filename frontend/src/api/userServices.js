import api from "../services/api";

export const getAllUsers = async () => {
  const response = await api.get("/users/users");
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get("/users/profile");
  return response.data;
};

export const updateProfile = async (formData) => {
  const response = await api.put("/users/profile", formData);
  return response.data;
};

export const searchUsersApi = async (query) => {
  const response = await api.get(`/users/search?search=${query}`);
  return response.data;
};

export const addContactApi = async (name, phoneNumber) => {
  const response = await api.post("/users/contacts", { name, phoneNumber });
  return response.data;
};

export const getContactsApi = async () => {
  const response = await api.get("/users/contacts");
  return response.data;
};

export const deleteContactApi = async (identifier) => {
  const response = await api.delete(`/users/contacts/${identifier}`);
  return response.data;
};