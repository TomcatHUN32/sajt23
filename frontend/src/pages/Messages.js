import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../components/Header";
import { FriendsSidebar } from "../components/FriendsSidebar";
import { ChatWindow } from "../components/ChatWindow";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Send, MessageCircle } from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export const Messages = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [directChat, setDirectChat] = useState(null);

  // Handle URL params for direct messaging (from marketplace etc.)
  useEffect(() => {
    const userId = searchParams.get('userId');
    const username = searchParams.get('username');
    const profilePic = searchParams.get('profilePic');

    if (userId && username) {
      setDirectChat({
        user_id: userId,
        username: decodeURIComponent(username),
        profile_pic: profilePic ? decodeURIComponent(profilePic) : '',
        online_status: 'offline'
      });
      // Clear URL params
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const closeDirectChat = () => {
    setDirectChat(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Direct chat from marketplace */}
        {directChat && (
          <div className="mb-6 bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h2 className="text-white font-bold">Üzenet küldése: {directChat.username}</h2>
            </div>
            <div className="h-[60vh]">
              <ChatWindow
                friend={directChat}
                onClose={closeDirectChat}
                unreadCount={0}
                onMessageRead={() => {}}
              />
            </div>
          </div>
        )}

        {!directChat && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <FriendsSidebar />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
