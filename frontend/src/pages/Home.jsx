import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("phoneNumber");

    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Header */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm">
        <h1 className="text-2xl font-bold text-blue-600">
          Realtime Chat
        </h1>

        <button
          onClick={() => navigate("/profile")}
          className="px-4 py-2 rounded-lg bg-gray-100
                     hover:bg-gray-200 transition"
        >
          Profile
        </button>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto p-6">

        <div className="bg-white rounded-2xl shadow-lg p-8">

          <h2 className="text-3xl font-bold text-gray-800">
            Welcome to Realtime Chat 👋
          </h2>

          <p className="text-gray-500 mt-2">
            Start a conversation with your friends.
          </p>

          <div className="mt-8 flex gap-4">

            <button
              onClick={() => navigate("/chat")}
              className="px-6 py-3 bg-blue-600 text-white
                         rounded-xl font-semibold
                         hover:bg-blue-700 transition"
            >
              Open Chat
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="px-6 py-3 bg-gray-200 text-gray-700
                         rounded-xl font-semibold
                         hover:bg-gray-300 transition"
            >
              My Profile
            </button>

          </div>

          <button
            onClick={handleLogout}
            className="mt-8 text-red-500 hover:text-red-600
                       font-medium"
          >
            Logout
          </button>

        </div>

      </main>

    </div>
  );
}

export default Home;