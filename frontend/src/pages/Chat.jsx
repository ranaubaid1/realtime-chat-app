import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../services/socket";

import { getAllUsers, getProfile, addContactApi, getContactsApi } from "../api/userServices";
import { createConversation, getConversations } from "../api/conversationServices";
import {
  getMessages,
  sendMessage,
  replyMessage,
  editMessage,
  deleteForMe,
  deleteForEveryone,
  addReaction,
  starMessage,
  pinMessage,
  forwardMessage,
} from "../api/messageServices";

// Import custom image icons from assets folder
import audioCallIcon from "../assets/audio call.jpeg";
import videoCallIcon from "../assets/video call.jpeg";
import galleryIcon from "../assets/gallery.jpeg";
import micIcon from "../assets/mic.jpeg";

function Chat() {
  const navigate = useNavigate();

  // State
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typing, setTyping] = useState(false);

  // Message Actions state
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState(null);
  const [forwardModalMessage, setForwardModalMessage] = useState(null);

  // Add Contact Modal State
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactNameInput, setContactNameInput] = useState("");
  const [contactPhoneInput, setContactPhoneInput] = useState("");
  const [addContactMessage, setAddContactMessage] = useState({ text: "", type: "" });
  const [savedContacts, setSavedContacts] = useState([]);

  // Theme Mode State ('dark' | 'light')
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("app_theme") || "dark";
  });

  const toggleThemeMode = () => {
    const newTheme = themeMode === "dark" ? "light" : "dark";
    setThemeMode(newTheme);
    localStorage.setItem("app_theme", newTheme);
  };

  const handleSaveNewContact = async (e) => {
    e?.preventDefault();
    setAddContactMessage({ text: "", type: "" });
    const name = contactNameInput.trim();
    const phone = contactPhoneInput.trim();
    if (!name || !phone) return;

    try {
      const res = await addContactApi(name, phone);
      const newContactObj = res.contact;

      const updatedList = [
        ...savedContacts.filter((c) => c.phoneNumber !== phone),
        newContactObj,
      ];
      setSavedContacts(updatedList);

      if (res.isRegistered) {
        setAddContactMessage({
          text: `✅ Contact "${name}" saved to database! Account found. Opening chat...`,
          type: "success",
        });
        setTimeout(() => {
          handleSelectUser(newContactObj);
          setShowAddContactModal(false);
          setContactNameInput("");
          setContactPhoneInput("");
          setAddContactMessage({ text: "", type: "" });
        }, 1000);
      } else {
        setAddContactMessage({
          text: `⚠️ Contact "${name}" (${phone}) saved to database, but this person has NO registered account on Realtime Chat yet. They cannot send or receive messages until they register!`,
          type: "warning",
        });
        setTimeout(() => {
          handleSelectUser(newContactObj);
          setShowAddContactModal(false);
          setContactNameInput("");
          setContactPhoneInput("");
          setAddContactMessage({ text: "", type: "" });
        }, 3500);
      }
    } catch (err) {
      console.error("Save contact error:", err);
      setAddContactMessage({ text: "Failed to save contact to database.", type: "warning" });
    }
  };

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // WebRTC Call State
  const [callStatus, setCallStatus] = useState(null); // 'calling' | 'incoming' | 'connected' | null
  const [callType, setCallType] = useState(null); // 'voice' | 'video'
  const [incomingCallData, setIncomingCallData] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);

  const messagesEndRef = useRef(null);

  // Helper function to resolve profile picture & attachment URLs properly
  const getImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const cleanPath = path.replace(/^public[\\/]/, "").replace(/\\/g, "/");
    const serverUrl =
      import.meta.env.VITE_SERVER_URL ||
      (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, "") : "http://localhost:5000");
    return `${serverUrl}/${cleanPath}`;
  };

  // ==========================================
  // 1. Initial Load & Socket Connection
  // ==========================================
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const profileRes = await getProfile();
        const userObj = profileRes.user || profileRes.data || profileRes;
        setCurrentUser(userObj);

        const usersRes = await getAllUsers();
        const userList = usersRes.users || usersRes.data || (Array.isArray(usersRes) ? usersRes : []);
        setUsers(userList);

        const contactsRes = await getContactsApi();
        if (contactsRes.success && Array.isArray(contactsRes.contacts)) {
          setSavedContacts(contactsRes.contacts);
        }

        if (!socket.connected) {
          socket.connect();
        }

        socket.emit("join", {
          id: userObj._id,
          username: userObj.username || userObj.phoneNumber,
        });

      } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    initializeChat();
  }, [navigate]);

  // Socket Event Listeners
  useEffect(() => {
    socket.on("user-updated", (updatedUser) => {
      if (!updatedUser || !updatedUser._id) return;
      setUsers((prevUsers) =>
        prevUsers.map((u) => (String(u._id) === String(updatedUser._id) ? { ...u, ...updatedUser } : u))
      );
      if (selectedUser && String(selectedUser._id) === String(updatedUser._id)) {
        setSelectedUser((prev) => ({ ...prev, ...updatedUser }));
      }
    });

    socket.on("online-users", (onlineList) => {
      setOnlineUsers(onlineList || []);
    });

    socket.on("user-online", (userId) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => String(u.id || u._id) === String(userId))) return prev;
        return [...prev, { id: userId }];
      });
    });

    socket.on("user-offline", (userId) => {
      setOnlineUsers((prev) => prev.filter((u) => String(u.id || u._id) !== String(userId)));
    });

    socket.on("private-message", (newMsg) => {
      const msgData = newMsg.data || newMsg;
      setMessages((prev) => [...prev, msgData]);
      scrollToBottom();
    });

    socket.on("typing", (data) => {
      if (selectedUser && String(data.senderId) === String(selectedUser._id)) {
        setTyping(true);
      }
    });

    socket.on("stop-typing", (data) => {
      if (selectedUser && String(data.senderId) === String(selectedUser._id)) {
        setTyping(false);
      }
    });

    // WebRTC Call Socket Events
    socket.on("incoming-call", (data) => {
      setIncomingCallData(data);
      setCallType(data.callType || "video");
      setCallStatus("incoming");
    });

    socket.on("call-accepted", async () => {
      setCallStatus("connected");
    });

    socket.on("call-rejected", () => {
      cleanupCall(false);
      alert("Call declined.");
    });

    socket.on("call-ended", () => {
      cleanupCall(false);
    });

    socket.on("offer", async (data) => {
      await handleReceiveOffer(data);
    });

    socket.on("answer", async (data) => {
      if (peerConnectionRef.current && data.answer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (e) {
          console.error("Answer setRemoteDescription error:", e);
        }
      }
    });

    socket.on("ice-candidate", async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Ice candidate error:", e);
        }
      }
    });

    return () => {
      socket.off("user-updated");
      socket.off("online-users");
      socket.off("user-online");
      socket.off("user-offline");
      socket.off("private-message");
      socket.off("typing");
      socket.off("stop-typing");
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("call-rejected");
      socket.off("call-ended");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ==========================================
  // 2. Select User & Load Chat
  // ==========================================
  const handleSelectUser = async (user) => {
    try {
      setSelectedUser(user);
      setMessages([]);
      setConversationId(null);
      setReplyingTo(null);
      setEditingMessage(null);

      const convRes = await createConversation(user._id);
      const conv = convRes.conversation || convRes.data || convRes;
      const cId = conv._id;

      if (cId) {
        setConversationId(cId);
        const msgRes = await getMessages(cId);
        const msgList = msgRes.data || msgRes.messages || (Array.isArray(msgRes) ? msgRes : []);
        setMessages(msgList);
      }
    } catch (error) {
      console.error("Error selecting user:", error);
    }
  };

  // ==========================================
  // 3. Send Text / Reply / Edit Message
  // ==========================================
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageText.trim() || !conversationId) return;

    try {
      setSending(true);

      // EDIT MODE
      if (editingMessage) {
        const editRes = await editMessage(editingMessage._id, messageText.trim());
        const updated = editRes.data || editRes;
        setMessages((prev) => prev.map((m) => (m._id === editingMessage._id ? updated : m)));
        setEditingMessage(null);
        setMessageText("");
        return;
      }

      // REPLY MODE
      if (replyingTo) {
        const replyRes = await replyMessage(conversationId, replyingTo._id, messageText.trim());
        const newReply = replyRes.data || replyRes;
        setMessages((prev) => [...prev, newReply]);
        setReplyingTo(null);
        setMessageText("");
        return;
      }

      // NORMAL TEXT SEND
      const response = await sendMessage(conversationId, messageText.trim());
      const newMsg = response.data || response;

      setMessages((prev) => [...prev, newMsg]);

      // Emit socket message
      socket.emit("private-message", {
        conversationId,
        senderId: currentUser._id,
        receiverId: selectedUser._id,
        data: newMsg,
      });

      setMessageText("");
      socket.emit("stop-typing", { senderId: currentUser._id, receiverId: selectedUser._id });

    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  // ==========================================
  // 4. File / Image Select Handler
  // ==========================================
  const handleFileOrImageUpload = async (file) => {
    if (!file || !conversationId) return;
    try {
      setSending(true);
      const res = await sendMessage(conversationId, "", file);
      const newMsg = res.data || res;
      setMessages((prev) => [...prev, newMsg]);

      socket.emit("private-message", {
        conversationId,
        senderId: currentUser._id,
        receiverId: selectedUser._id,
        data: newMsg,
      });
    } catch (error) {
      console.error("Upload error:", error);
      alert("File upload failed");
    } finally {
      setSending(false);
    }
  };

  // ==========================================
  // 5. Voice Note Recorder (Mic)
  // ==========================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access error:", err);
      alert("Microphone permission denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const sendVoiceNote = async () => {
    if (!audioBlob || !conversationId) return;
    const file = new File([audioBlob], `voicenote_${Date.now()}.webm`, { type: "audio/webm" });
    await handleFileOrImageUpload(file);
    setAudioBlob(null);
  };

  // ==========================================
  // 6. Message Actions
  // ==========================================
  const handleReaction = async (msgId, emoji) => {
    try {
      const res = await addReaction(msgId, emoji);
      const updated = res.data || res;
      setMessages((prev) => prev.map((m) => (m._id === msgId ? updated : m)));
      setActiveMenuMessageId(null);
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  const handleDeleteForMe = async (msgId) => {
    try {
      await deleteForMe(msgId);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      setActiveMenuMessageId(null);
    } catch (err) {
      console.error("Delete for me error:", err);
    }
  };

  const handleDeleteForEveryone = async (msgId) => {
    try {
      await deleteForEveryone(msgId);
      setMessages((prev) => prev.map((m) => (m._id === msgId ? { ...m, deletedForEveryone: true } : m)));
      setActiveMenuMessageId(null);
    } catch (err) {
      console.error("Delete for everyone error:", err);
    }
  };

  const handleStar = async (msgId) => {
    try {
      const res = await starMessage(msgId);
      const updated = res.data || res;
      setMessages((prev) => prev.map((m) => (m._id === msgId ? updated : m)));
      setActiveMenuMessageId(null);
    } catch (err) {
      console.error("Star error:", err);
    }
  };

  const handlePin = async (msgId) => {
    try {
      const res = await pinMessage(msgId);
      const updated = res.data || res;
      setMessages((prev) => prev.map((m) => (m._id === msgId ? updated : m)));
      setActiveMenuMessageId(null);
    } catch (err) {
      console.error("Pin error:", err);
    }
  };

  const handleForward = async (targetUser) => {
    if (!forwardModalMessage) return;
    try {
      const convRes = await createConversation(targetUser._id);
      const targetId = convRes.conversation?._id || convRes.data?._id || convRes._id;

      if (targetId) {
        await forwardMessage(forwardModalMessage._id, targetId);
        alert(`Message forwarded to ${targetUser.username}!`);
      }
    } catch (err) {
      console.error("Forward error:", err);
    } finally {
      setForwardModalMessage(null);
    }
  };

  // ==========================================
  // 7. WebRTC Calls
  // ==========================================
  const startCall = async (type) => {
    if (!selectedUser) return;
    setCallType(type);
    setCallStatus("calling");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeerConnection(selectedUser._id);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", {
        receiverId: selectedUser._id,
        senderId: currentUser._id,
        callType: type,
      });

      socket.emit("offer", {
        receiverId: selectedUser._id,
        senderId: currentUser._id,
        offer,
      });
    } catch (err) {
      console.error("Call error:", err);
      alert("Camera/Mic access failed.");
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCallData) return;
    setCallStatus("connected");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const callerId = incomingCallData.senderId;
      const pc = createPeerConnection(callerId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Process pending offer if it arrived before user accepted
      if (pendingOfferRef.current) {
        await handleReceiveOffer(pendingOfferRef.current);
      }

      socket.emit("accept-call", {
        receiverId: callerId,
        senderId: currentUser._id,
      });
    } catch (err) {
      console.error("Accept call error:", err);
    }
  };

  const rejectCall = () => {
    if (incomingCallData) {
      socket.emit("reject-call", { receiverId: incomingCallData.senderId });
    }
    cleanupCall();
  };

  const createPeerConnection = (targetUserId) => {
    const targetId = targetUserId || selectedUser?._id || incomingCallData?.senderId;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && targetId) {
        socket.emit("ice-candidate", {
          receiverId: targetId,
          senderId: currentUser._id,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const handleReceiveOffer = async (data) => {
    if (!data || !data.offer) return;

    try {
      if (!peerConnectionRef.current) {
        // Offer arrived before peer connection was created (accept clicked) -> store in pendingOfferRef
        pendingOfferRef.current = data;
        return;
      }

      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      const targetId = data.senderId || selectedUser?._id || incomingCallData?.senderId;

      socket.emit("answer", {
        receiverId: targetId,
        senderId: currentUser._id,
        answer,
      });
      pendingOfferRef.current = null;
    } catch (e) {
      console.error("Error in handleReceiveOffer:", e);
    }
  };

  const cleanupCall = (notifyOther = true) => {
    if (notifyOther) {
      const targetId = selectedUser?._id || incomingCallData?.senderId;
      if (targetId) {
        socket.emit("end-call", { receiverId: targetId, senderId: currentUser?._id });
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    peerConnectionRef.current = null;
    localStreamRef.current = null;
    pendingOfferRef.current = null;
    setCallStatus(null);
    setCallType(null);
    setIncomingCallData(null);
  };

  // Filtered Users list based on search (including saved contacts)
  const allDisplayUsers = [
    ...users.filter((u) => u._id !== currentUser?._id),
    ...savedContacts.filter(
      (sc) => sc.isUnregistered && !users.some((u) => u.phoneNumber === sc.phoneNumber)
    ),
  ];

  const filteredUsers = allDisplayUsers.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.username?.toLowerCase().includes(term) ||
      u.phoneNumber?.toLowerCase().includes(term) ||
      u.about?.toLowerCase().includes(term)
    );
  });

  const pinnedMessage = messages.find((m) => m.pinned);

  return (
    <div className={`h-screen flex overflow-hidden font-sans selection:bg-black selection:text-white transition-colors duration-300 ${themeMode === "dark" ? "bg-black text-white" : "bg-white text-black"}`}>
      {/* Hidden Audio Element for WebRTC Voice & Video Audio Streams */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      {/* ================= SIDEBAR ================= */}
      <div className={`w-80 md:w-96 border-r flex flex-col z-10 transition-colors duration-300 ${themeMode === "dark" ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200 shadow-xl"}`}>
        {/* User Profile Header */}
        <div className={`h-20 border-b flex items-center justify-between px-5 ${themeMode === "dark" ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
          <div className="flex items-center gap-3.5">
            <div className="relative">
              {currentUser?.profilePicture ? (
                <img
                  src={getImageUrl(currentUser.profilePicture)}
                  alt="Me"
                  className="w-11 h-11 rounded-2xl object-cover ring-2 ring-zinc-400 shadow"
                />
              ) : (
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg border shadow ${themeMode === "dark" ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}>
                  {(currentUser?.username || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full animate-pulse"></span>
            </div>
            <div className="min-w-0">
              <h1 className={`font-bold text-sm truncate ${themeMode === "dark" ? "text-white" : "text-black"}`}>{currentUser?.username || "My Profile"}</h1>
              <p className="text-[11px] text-emerald-500 font-medium tracking-wide">Online</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleThemeMode}
              className={`p-2.5 rounded-xl transition-all duration-200 border font-bold shadow ${
                themeMode === "dark"
                  ? "bg-zinc-900 hover:bg-zinc-800 text-amber-300 border-zinc-800"
                  : "bg-zinc-100 hover:bg-zinc-200 text-black border-zinc-300"
              }`}
              title={themeMode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {themeMode === "dark" ? "☀️" : "🌙"}
            </button>

            <button
              onClick={() => {
                setShowAddContactModal(true);
                setAddContactMessage({ text: "", type: "" });
                setContactNameInput("");
                setContactPhoneInput("");
              }}
              className={`px-3 py-2 rounded-xl transition-all duration-200 font-bold text-xs flex items-center gap-1.5 shadow ${
                themeMode === "dark"
                  ? "bg-white hover:bg-zinc-200 text-black border border-white"
                  : "bg-black hover:bg-zinc-800 text-white border border-black"
              }`}
              title="Add New Contact by Name & Phone"
            >
              <span className="text-sm font-bold">➕</span>
              <span className="hidden sm:inline">Add Contact</span>
            </button>

            <button
              onClick={() => navigate("/profile")}
              className={`p-2.5 rounded-xl transition-all duration-200 border ${
                themeMode === "dark"
                  ? "hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800"
                  : "hover:bg-zinc-200 text-zinc-700 hover:text-black border-zinc-300"
              }`}
              title="Edit Profile"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className={`p-4 border-b ${themeMode === "dark" ? "border-zinc-800" : "border-zinc-200"}`}>
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                themeMode === "dark"
                  ? "bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:ring-white"
                  : "bg-white border-zinc-300 text-black placeholder-zinc-400 focus:ring-black"
              }`}
            />
            <span className="absolute left-3.5 top-2.5 text-zinc-400 text-sm">🔍</span>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5 custom-scrollbar">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No contacts found.</div>
          ) : (
            filteredUsers.map((user) => {
              const isOnline = onlineUsers.some(
                (u) => String(u.id || u._id) === String(user._id)
              );
              const isSelected = selectedUser?._id === user._id;

              return (
                <div
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className={`p-3.5 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all duration-200 group ${
                    isSelected
                      ? themeMode === "dark"
                        ? "bg-white text-black font-semibold border-l-4 border-white shadow-md"
                        : "bg-black text-white font-semibold shadow-md"
                      : themeMode === "dark"
                      ? "hover:bg-zinc-900 text-zinc-300 border border-transparent"
                      : "hover:bg-zinc-200 text-zinc-800 border border-transparent"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {user.profilePicture ? (
                      <img
                        src={getImageUrl(user.profilePicture)}
                        alt={user.username}
                        className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-700 group-hover:ring-slate-600 transition"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 text-slate-200 flex items-center justify-center font-bold text-lg border border-slate-700/60 shadow">
                        {(user.username || user.phoneNumber || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-sm"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h2 className="font-semibold text-slate-200 truncate text-sm group-hover:text-white transition">
                        {user.username || user.phoneNumber}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {user.isUnregistered ? (
                        <span className="text-rose-400 font-medium">⚠️ No Account</span>
                      ) : isOnline ? (
                        <span className="text-emerald-400 font-medium">● Online</span>
                      ) : (
                        user.about || "Hey there! I am using Realtime Chat."
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= CHAT AREA ================= */}
      <div className={`flex-1 flex flex-col relative overflow-hidden transition-colors duration-300 ${themeMode === "dark" ? "bg-black text-white" : "bg-white text-black"}`}>
        {!selectedUser ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl mb-5 border shadow-2xl ${
              themeMode === "dark"
                ? "bg-zinc-900 border-zinc-800 text-white"
                : "bg-zinc-100 border-zinc-300 text-black shadow-zinc-200"
            }`}>
              💬
            </div>
            <h2 className={`text-3xl font-extrabold tracking-tight ${themeMode === "dark" ? "text-white" : "text-black"}`}>
              Realtime Chat App
            </h2>
            <p className={`max-w-md mt-3 text-sm leading-relaxed ${themeMode === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>
              Select a contact to start chatting, sharing high quality photos, voice notes, documents, and making HD calls!
            </p>
          </div>
        ) : (
          <>
            {/* Unregistered User Warning Banner */}
            {selectedUser?.isUnregistered && (
              <div className="bg-rose-950/80 border-b border-rose-500/40 px-6 py-3 flex items-center gap-3 text-xs text-rose-200">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-bold text-rose-300">Account Not Found</p>
                  <p className="text-[11px] opacity-90">
                    <b>{selectedUser.username}</b> ({selectedUser.phoneNumber}) has not registered on Realtime Chat yet. Messages and calls cannot be delivered until they create an account.
                  </p>
                </div>
              </div>
            )}
            <div className={`h-20 border-b px-6 flex items-center justify-between z-10 transition-colors duration-300 ${
              themeMode === "dark" ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-black shadow-sm"
            }`}>
              <div className="flex items-center gap-3.5">
                {selectedUser.profilePicture ? (
                  <img
                    src={getImageUrl(selectedUser.profilePicture)}
                    alt={selectedUser.username}
                    className="w-11 h-11 rounded-2xl object-cover ring-2 ring-zinc-400"
                  />
                ) : (
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg border shadow ${themeMode === "dark" ? "bg-white text-black border-white" : "bg-black text-white border-black"}`}>
                    {(selectedUser.username || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className={`font-bold text-base ${themeMode === "dark" ? "text-white" : "text-black"}`}>
                    {selectedUser.username || selectedUser.phoneNumber}
                  </h2>
                  <p className={`text-xs ${themeMode === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>
                    {typing ? (
                      <span className="text-emerald-500 font-semibold animate-pulse">Typing message...</span>
                    ) : onlineUsers.some((u) => String(u.id || u._id) === String(selectedUser._id)) ? (
                      <span className="text-emerald-500 font-medium">● Online</span>
                    ) : (
                      "Offline"
                    )}
                  </p>
                </div>
              </div>

              {/* Call Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => startCall("voice")}
                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-2xl border border-emerald-500/20 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
                  title="Voice Call"
                >
                  <img src={audioCallIcon} alt="Voice Call" className="w-8 h-8 rounded-xl object-cover shadow" />
                </button>
                <button
                  onClick={() => startCall("video")}
                  className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-2xl border border-indigo-500/20 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
                  title="Video Call"
                >
                  <img src={videoCallIcon} alt="Video Call" className="w-8 h-8 rounded-xl object-cover shadow" />
                </button>
              </div>
            </div>

            {/* Pinned Banner */}
            {pinnedMessage && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300">
                <span className="font-medium truncate">📌 Pinned Message: {pinnedMessage.text || "Attachment"}</span>
                <button onClick={() => handlePin(pinnedMessage._id)} className="underline hover:text-amber-200 ml-2 font-semibold">
                  Unpin
                </button>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className={`h-full flex items-center justify-center text-sm font-medium ${themeMode === "dark" ? "text-zinc-500" : "text-zinc-600"}`}>
                  No messages in this chat yet. Say hello! 👋
                </div>
              ) : (
                messages.map((message) => {
                  if (message.deletedFor?.includes(currentUser._id)) return null;

                  const isMine = (message.sender?._id || message.sender) === currentUser._id;
                  const isMenuOpen = activeMenuMessageId === message._id;

                  return (
                    <div
                      key={message._id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div className="relative group max-w-xs lg:max-w-md">
                        {/* Replying Banner */}
                        {message.replyTo && (
                          <div className="bg-indigo-900/40 border-l-4 border-indigo-500 text-indigo-200 text-xs px-3 py-1.5 rounded-t-xl mb-1">
                            Replying to message...
                          </div>
                        )}

                        <div
                          className={`px-4 py-3 rounded-2xl relative shadow-md transition-all duration-200 ${
                            isMine
                              ? themeMode === "dark"
                                ? "bg-white text-black rounded-br-none font-medium shadow-md shadow-white/10"
                                : "bg-black text-white rounded-br-none font-medium shadow-md"
                              : themeMode === "dark"
                              ? "bg-zinc-900 text-white border border-zinc-800 rounded-bl-none"
                              : "bg-zinc-100 text-black border border-zinc-200 rounded-bl-none shadow-sm"
                          }`}
                        >
                          {/* Image */}
                          {message.messageType === "image" && message.image && (
                            <img
                              src={getImageUrl(message.image)}
                              alt="Attachment"
                              className="max-w-full rounded-xl mb-2 object-cover max-h-64 border border-slate-700/50"
                            />
                          )}

                          {/* Raw File */}
                          {message.messageType === "file" && message.file && (
                            <a
                              href={getImageUrl(message.file)}
                              target="_blank"
                              rel="noreferrer"
                              className={`underline break-all flex items-center gap-2 text-sm py-1 font-semibold ${
                                isMine
                                  ? themeMode === "dark" ? "text-black hover:text-zinc-700" : "text-white hover:text-zinc-200"
                                  : themeMode === "dark" ? "text-indigo-300 hover:text-indigo-200" : "text-indigo-600 hover:text-indigo-800"
                              }`}
                            >
                              📄 {message.fileName || "Download Attachment"}
                            </a>
                          )}

                          {/* Audio Note */}
                          {message.messageType === "audio" && message.audio && (
                            <audio controls src={getImageUrl(message.audio)} className="max-w-full my-1 rounded-lg" />
                          )}

                          {/* Text Message */}
                          {message.deletedForEveryone ? (
                            <p className="italic text-xs opacity-60">🚫 This message was deleted</p>
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{message.text}</p>
                          )}

                          {/* Timestamp & Status */}
                          <div className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] ${
                            isMine
                              ? themeMode === "dark" ? "text-zinc-600" : "text-zinc-300"
                              : themeMode === "dark" ? "text-zinc-400" : "text-zinc-500"
                          }`}>
                            {message.edited && <span>(edited)</span>}
                            {message.starredBy?.length > 0 && <span>⭐</span>}
                            <span>
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Reactions Display */}
                          {message.reactions?.length > 0 && (
                            <div className="absolute -bottom-2.5 right-3 bg-slate-800 text-slate-100 text-xs px-2 py-0.5 rounded-full shadow border border-slate-700 flex items-center gap-1">
                              {message.reactions.map((r, i) => (
                                <span key={i}>{r.emoji}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Hover Trigger Button */}
                        {!message.deletedForEveryone && (
                          <button
                            onClick={() =>
                              setActiveMenuMessageId(isMenuOpen ? null : message._id)
                            }
                            className={`absolute top-1 ${
                              isMine ? "-left-8" : "-right-8"
                            } opacity-0 group-hover:opacity-100 p-1.5 transition ${
                              themeMode === "dark" ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-black"
                            }`}
                          >
                            ⋮
                          </button>
                        )}

                        {/* Context Menu Dropdown */}
                        {isMenuOpen && (
                          <div
                            className={`absolute z-30 top-8 ${
                              isMine ? "right-0" : "left-0"
                            } shadow-2xl rounded-2xl p-2 border text-xs w-48 space-y-1 ${
                              themeMode === "dark"
                                ? "bg-zinc-900 border-zinc-800 text-white"
                                : "bg-white border-zinc-200 text-black shadow-lg"
                            }`}
                          >
                            <div className={`flex justify-between px-2 py-1.5 border-b text-base ${themeMode === "dark" ? "border-zinc-800" : "border-zinc-200"}`}>
                              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(message._id, emoji)}
                                  className="hover:scale-130 transition transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>

                            <button
                              onClick={() => {
                                setReplyingTo(message);
                                setActiveMenuMessageId(null);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 transition ${
                                themeMode === "dark" ? "hover:bg-zinc-800 text-zinc-200" : "hover:bg-zinc-100 text-zinc-800"
                              }`}
                            >
                              ↩️ Reply
                            </button>

                            {isMine && (
                              <button
                                onClick={() => {
                                  setEditingMessage(message);
                                  setMessageText(message.text || "");
                                  setActiveMenuMessageId(null);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 transition ${
                                  themeMode === "dark" ? "hover:bg-zinc-800 text-zinc-200" : "hover:bg-zinc-100 text-zinc-800"
                                }`}
                              >
                                ✏️ Edit
                              </button>
                            )}

                            <button
                              onClick={() => handleStar(message._id)}
                              className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 transition ${
                                themeMode === "dark" ? "hover:bg-zinc-800 text-zinc-200" : "hover:bg-zinc-100 text-zinc-800"
                              }`}
                            >
                              ⭐ {message.starredBy?.includes(currentUser._id) ? "Unstar" : "Star"}
                            </button>

                            <button
                              onClick={() => handlePin(message._id)}
                              className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 transition ${
                                themeMode === "dark" ? "hover:bg-zinc-800 text-zinc-200" : "hover:bg-zinc-100 text-zinc-800"
                              }`}
                            >
                              📌 {message.pinned ? "Unpin" : "Pin"}
                            </button>

                            <button
                              onClick={() => {
                                setForwardModalMessage(message);
                                setActiveMenuMessageId(null);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 transition ${
                                themeMode === "dark" ? "hover:bg-zinc-800 text-zinc-200" : "hover:bg-zinc-100 text-zinc-800"
                              }`}
                            >
                              ➡️ Forward
                            </button>

                            <button
                              onClick={() => handleDeleteForMe(message._id)}
                              className="w-full text-left px-3 py-2 hover:bg-rose-950/40 text-rose-400 rounded-xl flex items-center gap-2 transition"
                            >
                              🗑️ Delete for Me
                            </button>

                            {isMine && (
                              <button
                                onClick={() => handleDeleteForEveryone(message._id)}
                                className="w-full text-left px-3 py-2 hover:bg-rose-950/60 text-rose-400 font-semibold rounded-xl flex items-center gap-2 transition"
                              >
                                💥 Delete for Everyone
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying Banner */}
            {replyingTo && (
              <div className="bg-indigo-950/60 border-t border-indigo-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-indigo-300">
                <span className="truncate">Replying to: <b>{replyingTo.text || "Attachment"}</b></span>
                <button onClick={() => setReplyingTo(null)} className="text-rose-400 font-bold ml-2">
                  ✖
                </button>
              </div>
            )}

            {/* Editing Banner */}
            {editingMessage && (
              <div className="bg-amber-950/60 border-t border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300">
                <span>Editing Message</span>
                <button
                  onClick={() => {
                    setEditingMessage(null);
                    setMessageText("");
                  }}
                  className="text-rose-400 font-bold ml-2"
                >
                  Cancel Edit ✖
                </button>
              </div>
            )}

            {/* Audio Recording Banner */}
            {audioBlob && (
              <div className="bg-emerald-950/60 border-t border-emerald-500/30 px-6 py-3 flex items-center justify-between text-sm text-emerald-300">
                <span>🎤 Voice note recorded!</span>
                <div className="flex gap-2">
                  <button
                    onClick={sendVoiceNote}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl font-semibold text-xs shadow-md"
                  >
                    Send Voice Note
                  </button>
                  <button
                    onClick={() => setAudioBlob(null)}
                    className="bg-rose-900/40 text-rose-300 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Footer Input Form */}
            <form onSubmit={handleSendMessage} className={`border-t p-4 flex items-center gap-3 transition-colors duration-300 ${
              themeMode === "dark" ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-md"
            }`}>
              {/* File Attachment */}
              <label
                htmlFor="file-input"
                className={`p-1.5 rounded-2xl cursor-pointer transition border flex items-center justify-center ${
                  themeMode === "dark" ? "bg-zinc-800 hover:bg-zinc-700 border-zinc-700" : "bg-zinc-100 hover:bg-zinc-200 border-zinc-300"
                }`}
                title="Attach Photo or Document"
              >
                <img src={galleryIcon} alt="Gallery" className="w-8 h-8 rounded-xl object-cover shadow" />
              </label>
              <input
                id="file-input"
                type="file"
                className="hidden"
                onChange={(e) => handleFileOrImageUpload(e.target.files[0])}
              />

              {/* Text Input */}
              <input
                type="text"
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  socket.emit("typing", { senderId: currentUser._id, receiverId: selectedUser._id });
                }}
                onBlur={() => {
                  socket.emit("stop-typing", { senderId: currentUser._id, receiverId: selectedUser._id });
                }}
                placeholder={
                  selectedUser?.isUnregistered
                    ? "Cannot send message — User has no registered account"
                    : isRecording
                    ? `Recording voice note... (${recordingTime}s)`
                    : "Type a message..."
                }
                disabled={isRecording || selectedUser?.isUnregistered}
                className={`flex-1 px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 disabled:opacity-50 transition ${
                  themeMode === "dark"
                    ? "bg-black border-zinc-800 text-white placeholder-zinc-500 focus:ring-white"
                    : "bg-zinc-100 border-zinc-300 text-black placeholder-zinc-400 focus:ring-black"
                }`}
              />

              {/* Mic Record Button */}
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-3 bg-rose-600 text-white font-semibold rounded-2xl animate-pulse text-sm"
                >
                  ⏹ Stop ({recordingTime}s)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={selectedUser?.isUnregistered}
                  className={`p-1.5 rounded-2xl transition border flex items-center justify-center disabled:opacity-40 ${
                    themeMode === "dark" ? "bg-zinc-800 hover:bg-zinc-700 border-zinc-700" : "bg-zinc-100 hover:bg-zinc-200 border-zinc-300"
                  }`}
                  title="Record Voice Note"
                >
                  <img src={micIcon} alt="Voice Note" className="w-8 h-8 rounded-xl object-cover shadow" />
                </button>
              )}

              {/* Send Button */}
              <button
                type="submit"
                disabled={!messageText.trim() || sending || selectedUser?.isUnregistered}
                className={`px-6 py-3 font-bold rounded-2xl transition text-sm shadow-md disabled:opacity-40 ${
                  themeMode === "dark"
                    ? "bg-white hover:bg-zinc-200 text-black shadow-white/10"
                    : "bg-black hover:bg-zinc-800 text-white shadow-black/20"
                }`}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Forward Modal */}
      {forwardModalMessage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4">Forward Message To:</h3>
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800 mb-4 custom-scrollbar">
              {users.map((u) => (
                <div
                  key={u._id}
                  onClick={() => handleForward(u)}
                  className="p-3 hover:bg-slate-800 cursor-pointer flex items-center gap-3 rounded-2xl transition"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    {(u.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-slate-200">{u.username || u.phoneNumber}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setForwardModalMessage(null)}
              className="w-full py-3 bg-slate-800 text-slate-300 rounded-2xl font-semibold text-sm hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* WebRTC Call Overlay Modal */}
      {callStatus && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-100 max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-1">
              {callType === "video" ? "📹 Video Call" : "📞 Voice Call"}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {callStatus === "incoming"
                ? `Incoming call from ${incomingCallData?.senderId}...`
                : callStatus === "calling"
                ? `Calling ${selectedUser?.username}...`
                : "Connected"}
            </p>

            {callType === "video" && (
              <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden mb-6 flex items-center justify-center border border-slate-800">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-3 right-3 w-28 h-20 bg-black rounded-xl object-cover border-2 border-slate-700 shadow-xl"
                />
              </div>
            )}

            <div className="flex justify-center gap-4">
              {callStatus === "incoming" ? (
                <>
                  <button
                    onClick={acceptCall}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-2xl text-sm transition"
                  >
                    Accept
                  </button>
                  <button
                    onClick={rejectCall}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 font-bold rounded-2xl text-sm transition"
                  >
                    Decline
                  </button>
                </>
              ) : (
                <button
                  onClick={cleanupCall}
                  className="px-8 py-3 bg-rose-600 hover:bg-rose-700 font-bold rounded-2xl text-sm transition shadow-lg shadow-rose-600/30"
                >
                  End Call
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Contact / Save New Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl relative ${
            themeMode === "dark" ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-black shadow-2xl"
          }`}>
            <div className={`flex items-center justify-between mb-4 border-b pb-3 ${themeMode === "dark" ? "border-zinc-800" : "border-zinc-200"}`}>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>👤</span> Add New Contact
              </h3>
              <button
                onClick={() => {
                  setShowAddContactModal(false);
                  setAddContactMessage({ text: "", type: "" });
                }}
                className={`text-lg font-bold p-1 ${themeMode === "dark" ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-black"}`}
              >
                ✖
              </button>
            </div>

            <p className={`text-xs mb-4 leading-relaxed ${themeMode === "dark" ? "text-zinc-400" : "text-zinc-600"}`}>
              Enter the <b>Contact Name</b> and <b>Phone Number</b> to save to your contacts and verify account status.
            </p>

            <form onSubmit={handleSaveNewContact} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${themeMode === "dark" ? "text-zinc-300" : "text-zinc-700"}`}>
                  Contact Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Faran or Ali"
                  value={contactNameInput}
                  onChange={(e) => setContactNameInput(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 ${
                    themeMode === "dark"
                      ? "bg-black border-zinc-800 text-white placeholder-zinc-500 focus:ring-white"
                      : "bg-zinc-100 border-zinc-300 text-black placeholder-zinc-400 focus:ring-black"
                  }`}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${themeMode === "dark" ? "text-zinc-300" : "text-zinc-700"}`}>
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 03374790132"
                  value={contactPhoneInput}
                  onChange={(e) => setContactPhoneInput(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 ${
                    themeMode === "dark"
                      ? "bg-black border-zinc-800 text-white placeholder-zinc-500 focus:ring-white"
                      : "bg-zinc-100 border-zinc-300 text-black placeholder-zinc-400 focus:ring-black"
                  }`}
                  required
                />
              </div>

              {addContactMessage.text && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-medium border leading-relaxed ${
                    addContactMessage.type === "success"
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
                      : "bg-amber-950/80 text-amber-300 border-amber-500/50"
                  }`}
                >
                  {addContactMessage.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition border ${
                    themeMode === "dark"
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                      : "bg-zinc-200 hover:bg-zinc-300 text-zinc-800 border-zinc-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm transition shadow ${
                    themeMode === "dark"
                      ? "bg-white hover:bg-zinc-200 text-black"
                      : "bg-black hover:bg-zinc-800 text-white"
                  }`}
                >
                  Save & Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;