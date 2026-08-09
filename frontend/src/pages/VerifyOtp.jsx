import { verifyOtp } from "../api/authServices";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      return;
    }

    try {
      setLoading(true);

      const phoneNumber = localStorage.getItem("phoneNumber");

      if (!phoneNumber) {
        console.error("Phone number not found");
        return;
      }

      const data = await verifyOtp(phoneNumber, otp);

      console.log("OTP response:", data);

      // JWT token save
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      // Agar backend response ke andar token ho
      if (data.data?.token) {
        localStorage.setItem("token", data.data.token);
      }

      console.log(
        "Saved token:",
        localStorage.getItem("token")
      );

      navigate("/chat");

    } catch (error) {
      console.error(
        "Error verifying OTP:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">
          Verify OTP
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Enter the OTP sent to your phone
        </p>

        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter OTP"
          maxLength={6}
          className="w-full border border-gray-300 rounded-xl px-4 py-3
                     text-center text-xl tracking-[0.5em]
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:border-blue-500"
        />

        <button
          onClick={handleVerifyOtp}
          disabled={loading || !otp.trim()}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl
                     font-semibold transition
                     hover:bg-blue-700
                     disabled:bg-gray-400
                     disabled:cursor-not-allowed
                     flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <span
                className="w-5 h-5 border-2 border-white
                           border-t-transparent rounded-full
                           animate-spin"
              ></span>

              Verifying...
            </>
          ) : (
            "Verify OTP"
          )}
        </button>

      </div>

    </div>
  );
}

export default VerifyOtp;