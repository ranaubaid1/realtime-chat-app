import api from "../services/api";

// Login / Send OTP
export const loginuser = async (phoneNumber) => {
  const response = await api.post("/users/login", { phoneNumber });
  return response.data;
};

// Register New User
export const registerUser = async (username, phoneNumber) => {
  const response = await api.post("/users/register", { username, phoneNumber });
  return response.data;
};
export const verifyOtp = async (phoneNumber, otp) => {
  const response = await api.post("/users/verify-otp", { phoneNumber, otp });
  return response.data;
};