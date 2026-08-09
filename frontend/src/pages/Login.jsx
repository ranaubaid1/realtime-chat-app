import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginuser, registerUser } from "../api/authServices";

/**
 * Login Component
 * Handles user login via OTP and registers new users if 404 is returned from the backend.
 */
function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  // Handle OTP request for existing registered users
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return setErrorMessage("Please enter your phone number");

    setLoading(true);
    setErrorMessage("");

    try {
      const data = await loginuser(phoneNumber);
      localStorage.setItem("phoneNumber", phoneNumber);
      navigate("/verify-otp");
    } catch (error) {
      // If 404 is returned (User not registered), enable registration form mode
      if (error.response && error.response.status === 404) {
        setIsNewUser(true);
        setErrorMessage("Account not found. Please enter a username to register.");
      } else {
        setErrorMessage(error.response?.data?.message || "Something went wrong!");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle new user registration and then send OTP
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username) return setErrorMessage("Please enter a username");

    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Register the new user
      await registerUser(username, phoneNumber);
      // 2. Request OTP after successful registration
      await loginuser(phoneNumber);

      localStorage.setItem("phoneNumber", phoneNumber);
      navigate("/verify-otp");
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Registration failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-200">
        <h1 className="text-3xl font-extrabold text-blue-600 text-center mb-2">
          RealTime Chat App
        </h1>
        <p className="text-gray-500 text-center mb-6">
          {isNewUser ? "Create your account" : "Enter your phone number to continue"}
        </p>

        {errorMessage && (
          <div className="bg-red-100 text-red-600 p-3 rounded-xl text-sm mb-4 text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={isNewUser ? handleRegister : handleLogin} className="space-y-4">
          {/* Phone Number Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              placeholder="e.g. 03001234567"
              value={phoneNumber}
              disabled={isNewUser} // Lock phone input during registration mode
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* Username Input (Only visible when registering a new account) */}
          {isNewUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name / Username
              </label>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Action Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition flex justify-center items-center"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
            ) : isNewUser ? (
              "Register & Send OTP"
            ) : (
              "Send OTP"
            )}
          </button>
        </form>

        {/* Back to Login link */}
        {isNewUser && (
          <button
            onClick={() => {
              setIsNewUser(false);
              setErrorMessage("");
            }}
            className="w-full text-sm text-gray-500 hover:underline mt-4 text-center block"
          >
            ← Back to Login
          </button>
        )}
      </div>
    </div>
  );
}

export default Login;