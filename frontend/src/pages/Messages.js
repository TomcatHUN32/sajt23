import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { FriendsSidebar } from "../components/FriendsSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Send } from "lucide-react";
import api from "../utils/api";
import { useSocket } from "../context/SocketContext";

export const Messages = () => {

  const { socket } = useSocket();

  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  // Üzenetek betöltése amikor kiválasztunk egy ismerőst
  useEffect(() => {

    if (!selectedFriend) return;

    loadMessages();

  }, [selectedFriend]);

  const loadMessages = async () => {

    try {

      const response = await api.get(`/messages/${selectedFriend.user_id}`);
      setMessages(response.data);

    } catch (error) {

      console.error(error);

    }

  };

  // Realtime üzenetek socketből
  useEffect(() => {

    if (!socket) return;

    socket.on("receive_message", (data) => {

      setMessages(prev => [...prev, data]);

    });

    return () => socket.off("receive_message");

  }, [socket]);

  // Üzenet küldése
  const sendMessage = async () => {

    if (!message.trim() || !selectedFriend) return;

    try {

      const response = await api.post("/messages", {
        receiver_id: selectedFriend.user_id,
        content: message
      });

      setMessages(prev => [...prev, response.data]);
      setMessage("");

    } catch (error) {

      console.error(error);

    }

  };

  return (

    <div className="min-h-screen bg-background">

      <Header />

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* FRIEND LIST */}
        <div className="bg-zinc-900 rounded-xl p-4">

          <h2 className="text-white font-bold mb-4">
            Beszélgetések
          </h2>

          <FriendsSidebar
            onSelectFriend={(friend) => setSelectedFriend(friend)}
          />

        </div>

        {/* CHAT WINDOW */}
        <div className="md:col-span-2 bg-zinc-900 rounded-xl flex flex-col min-h-[70vh]">

          {/* HEADER */}
          {selectedFriend && (

            <div className="flex items-center gap-3 border-b border-white/10 p-4">

              <Avatar>
                <AvatarImage src={selectedFriend.profile_pic} />
                <AvatarFallback>
                  {selectedFriend.username?.[0]}
                </AvatarFallback>
              </Avatar>

              <div>
                <p className="text-white font-semibold">
                  {selectedFriend.username}
                </p>
                <p className="text-zinc-400 text-xs">
                  Online állapot hamarosan
                </p>
              </div>

            </div>

          )}

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">

            {!selectedFriend && (

              <div className="text-zinc-400 text-center mt-20">
                Válassz egy beszélgetést
              </div>

            )}

            {messages.map((msg) => (

              <div
                key={msg.message_id}
                className={`p-3 rounded-lg max-w-xs ${
                  msg.sender_id === selectedFriend.user_id
                    ? "bg-zinc-800 text-white"
                    : "bg-primary text-white ml-auto"
                }`}
              >

                {msg.content}

              </div>

            ))}

          </div>

          {/* INPUT */}
          {selectedFriend && (

            <div className="border-t border-white/10 p-3 flex gap-2">

              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Üzenet írása..."
                className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-white outline-none"
              />

              <button
                onClick={sendMessage}
                className="bg-primary p-2 rounded-lg hover:opacity-90"
              >

                <Send className="w-5 h-5 text-white" />

              </button>

            </div>

          )}

        </div>

      </div>

    </div>

  );

};