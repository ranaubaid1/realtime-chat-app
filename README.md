Full-Stack Realtime Chat Application

A modern, full-stack, real-time messaging application built with Node.js, Express, MongoDB, Socket.io, WebRTC, React, and Vite.

Overview

This application delivers a complete real-time communication experience, combining instant messaging, media sharing, and peer-to-peer voice/video calling in a single, scalable platform. It is designed with a modular backend architecture and a responsive, component-driven frontend.

Features

User Authentication & Registration
Phone number login with OTP verification and JWT-based session authentication. New users are automatically prompted to complete registration.

Real-Time Messaging
Instant, bidirectional messaging powered by Socket.io for low-latency communication.

Rich Media & File Sharing
Support for uploading and sending images, audio notes, and documents (PDF, DOCX, ZIP, TXT), with storage handled via Cloudinary.

Voice Notes
In-browser voice recording with a built-in timer and preview playback before sending.

WebRTC Voice & Video Calls
Real-time one-on-one voice and video calling using WebRTC peer connections.

Message Actions

Emoji reactions (👍 ❤️ 😂 😮 😢 🙏)
Reply to specific messages
Edit sent messages, marked with an (edited) tag
Delete for Me / Delete for Everyone
Star or unstar favorite messages
Pin or unpin messages within the chat header
Forward messages to other users

Live Search & Filtering
Real-time filtering of contacts and conversations as the user types.

Presence & Typing Indicators
Live online status and typing indicators for connected users.

Profile Management
Custom avatar uploads, editable username and status message, with live broadcast of profile updates across all connected clients.

Tech Stack
Backend
Technology	Purpose
Node.js & Express.js	REST API server
MongoDB & Mongoose	Data modeling (User, Conversation, Message)
Socket.io	Real-time events and WebRTC signaling
Cloudinary & Multer	Media and document storage
JSON Web Tokens (JWT)	Authentication and session security
Frontend
Technology	Purpose
React 19 (Vite)	Component-based UI framework
React Router DOM v7	Client-side routing
Socket.io Client	Real-time event integration
Axios	HTTP client with JWT auto-authorization
Tailwind CSS v4	Styling and UI animations
Project Structure
realtime-chat-app/
├── backend/
│   ├── config/             # Database & Cloudinary configuration
│   ├── controllers/        # User, Conversation, and Message controllers
│   ├── middleware/         # JWT authentication & Multer upload middleware
│   ├── models/             # Mongoose schemas (User, Conversation, Message)
│   ├── routes/             # Express API routes
│   ├── socket/             # Socket.io event listeners & WebRTC handlers
│   ├── public/uploads/     # Local static uploads fallback
│   ├── .env                # Environment variables (excluded from Git)
│   └── server.js           # Express server entry point
│
├── frontend/
│   ├── public/              # Static assets (favicons, wallpaper images)
│   ├── src/
│   │   ├── api/             # API service helpers (user, conversation, message)
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Login, VerifyOtp, Chat, Profile pages
│   │   ├── routes/          # Application route configuration
│   │   ├── services/        # Axios instance & Socket.io client setup
│   │   ├── App.jsx          # Root application component
│   │   └── main.jsx         # React root render entry point
│   └── vite.config.js       # Vite build configuration
│
├── .gitignore               # Git ignore rules
├── package.json              # Root setup and convenience scripts
└── README.md                 # Project documentation
Getting Started
Prerequisites
Node.js v18 or higher
MongoDB (local instance or MongoDB Atlas connection URI)
Cloudinary account (for media and file uploads)
1. Installation

Clone the repository and install dependencies for both backend and frontend:

bash
npm run install:all

Or install each separately:

bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
2. Environment Configuration

Create a .env file inside the backend/ directory with the following variables:

env
MONGODB_URI=mongodb://127.0.0.1:27017/whatsapp
PORT=5000
JWT_SECRET=your_jwt_secret_key_here

# Cloudinary Storage Credentials
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
3. Running the Application

Start the backend server:

bash
cd backend
npm run dev

Runs at http://localhost:5000

Start the frontend application (in a separate terminal):

bash
cd frontend
npm run dev

Runs at http://localhost:5173

Production Build

To generate and verify a production-ready frontend bundle:

bash
cd frontend
npm run build
License

This project is open source and available under the ISC License.