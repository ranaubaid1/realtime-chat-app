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