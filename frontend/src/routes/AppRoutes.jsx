import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import VerifyOtp from "../pages/VerifyOtp";
import Chat from "../pages/Chat";
import Home from "../pages/Home";
import Profile from "../pages/Profile";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/verify-otp" element={<VerifyOtp />} />

      <Route path="/home" element={<Home />} />

      <Route path="/chat" element={<Chat />} />

      <Route path="/profile" element={<Profile />} />

      {/* Unknown URL → Login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;