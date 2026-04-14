import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Header } from "../components/Header";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Textarea } from "../components/ui/textarea";

import {
  Camera,
  UserPlus,
  UserCheck,
  Clock,
  X,
  Image as ImageIcon,
  Users,
  FileText,
  Info,
  Grid3X3,
  Images,
  Edit3,
  Bold,
  Italic,
  Underline,
  Save,
  Settings,
  UserMinus
} from "lucide-react";

import { toast } from "sonner";

export const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, setUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [mutualFriends, setMutualFriends] = useState([]);

  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState("none");

  const [activeTab, setActiveTab] = useState("posts");

  const [openImage, setOpenImage] = useState(null);
  const [openImageTitle, setOpenImageTitle] = useState("");

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [bioSaving, setBioSaving] = useState(false);

  const isOwnProfile = currentUser?.user_id === userId;

  const imageSrc = (src) => {
    if (!src) return "";
    if (typeof src === "string" && src.startsWith("data:")) return src;
    return src;
  };

  const formatBio = (text) => {
    if (!text) return "";
    let formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/__(.+?)__/g, "<u>$1</u>")
      .replace(/\n/g, "<br>");
    return formatted;
  };

  const imagePosts = useMemo(
    () => posts.filter((post) => !!post.image_base64),
    [posts]
  );

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchFriends();

    if (!isOwnProfile && userId) {
      checkFriendshipStatus();
      fetchMutualFriends();
    }
  }, [userId]);

  useEffect(() => {
    if (!openImage) return;

    const handler = (e) => {
      if (e.key === "Escape") {
        closeViewer();
      }
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [openImage]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${userId}`);
      setProfile(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Profil betöltési hiba");
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await api.get(`/posts/user/${userId}`);
      setPosts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFriends = async () => {
    try {
      // Mindig a megtekintett profil ismerőseit kérjük le
      const res = await api.get(`/friends/list/${userId}`);
      setFriends(res.data || []);
    } catch (e) {
      console.error(e);
      setFriends([]);
    }
  };

  const checkFriendshipStatus = async () => {
    try {
      const res = await api.get(`/friends/status/${userId}`);
      setFriendshipStatus(res.data.status);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMutualFriends = async () => {
    try {
      const res = await api.get(`/friends/mutual/${userId}`);
      setMutualFriends(res.data || []);
    } catch (e) {
      console.error(e);
      setMutualFriends([]);
    }
  };

  const openViewer = (src, title = "") => {
    setOpenImage(src);
    setOpenImageTitle(title);
  };

  const closeViewer = () => {
    setOpenImage(null);
    setOpenImageTitle("");
  };

  const uploadImage = (file, type) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A kép maximum 5MB lehet");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        await api.put("/users/profile", { [type]: reader.result });

        setProfile((prev) => ({
          ...prev,
          [type]: reader.result
        }));

        if (type === "profile_pic") {
          setUser((prev) => ({
            ...prev,
            profile_pic: reader.result
          }));
        }

        if (type === "cover_pic") {
          setUser((prev) => ({
            ...prev,
            cover_pic: reader.result
          }));
        }

        toast.success("Kép frissítve");
      } catch (e) {
        console.error(e);
        toast.error("Hiba történt");
      }
    };

    reader.readAsDataURL(file);
  };

  const handleAddFriend = async () => {
    try {
      await api.post(`/friends/request?to_user_id=${userId}`);
      setFriendshipStatus("pending");
      toast.success("Ismerős kérés elküldve");
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Hiba történt");
    }
  };

  const handleRemoveFriend = async () => {
    if (!window.confirm("Biztosan törlöd ezt az ismerőst?")) return;
    try {
      await api.delete(`/friends/${userId}`);
      setFriendshipStatus("none");
      toast.success("Ismerős törölve");
      fetchFriends();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Hiba történt");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Card className="overflow-hidden border border-white/5 bg-zinc-900/90 shadow-lg shadow-black/30">
          <div className="relative">
            <div className="h-56 overflow-hidden bg-zinc-800 md:h-80">
              {profile?.cover_pic ? (
                <button
                  type="button"
                  className="block h-full w-full"
                  onClick={() => openViewer(profile.cover_pic, "Borítókép")}
                >
                  <img
                    src={imageSrc(profile.cover_pic)}
                    alt="Cover"
                    className="h-full w-full object-cover transition hover:scale-[1.01]"
                  />
                </button>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-zinc-800 to-zinc-900 text-zinc-500">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}

              {isOwnProfile && (
                <label className="absolute right-4 top-4 cursor-pointer rounded-full bg-black/70 p-2 transition hover:bg-black">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      uploadImage(e.target.files?.[0], "cover_pic")
                    }
                  />
                  <Camera className="h-5 w-5 text-white" />
                </label>
              )}
            </div>

            <CardContent className="pt-0">
              <div className="-mt-14 flex flex-col gap-6 md:-mt-16">
                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="relative w-fit">
                      <button
                        type="button"
                        className="block"
                        onClick={() =>
                          profile?.profile_pic &&
                          openViewer(profile.profile_pic, "Profilkép")
                        }
                      >
                        <Avatar className="h-28 w-28 border-4 border-background shadow-xl md:h-36 md:w-36">
                          {profile?.profile_pic ? (
                            <AvatarImage src={imageSrc(profile.profile_pic)} />
                          ) : (
                            <AvatarFallback className="bg-zinc-800 text-4xl text-white md:text-5xl">
                              {profile?.username?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </button>

                      {isOwnProfile && (
                        <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-black p-2 transition hover:bg-zinc-900">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              uploadImage(e.target.files?.[0], "profile_pic")
                            }
                          />
                          <Camera className="h-4 w-4 text-white" />
                        </label>
                      )}
                    </div>

                    <div className="min-w-0 pb-1 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="break-words text-3xl font-bold text-white">
                          {profile?.username}
                        </h1>
                        {isOwnProfile && (
                          <button
                            onClick={() => navigate('/settings')}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                            title="Beállítások"
                          >
                            <Settings className="h-4 w-4 text-zinc-400" />
                          </button>
                        )}
                      </div>

                      {isEditingBio ? (
                        <div className="mt-3 space-y-3 max-w-2xl">
                          <div className="flex items-center gap-2 p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                            <button
                              type="button"
                              onClick={() => {
                                const textarea = document.getElementById('bio-textarea');
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const selected = bioText.substring(start, end);
                                if (selected) {
                                  const newText = bioText.substring(0, start) + `**${selected}**` + bioText.substring(end);
                                  setBioText(newText);
                                }
                              }}
                              className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                              title="Félkövér"
                            >
                              <Bold className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const textarea = document.getElementById('bio-textarea');
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const selected = bioText.substring(start, end);
                                if (selected) {
                                  const newText = bioText.substring(0, start) + `*${selected}*` + bioText.substring(end);
                                  setBioText(newText);
                                }
                              }}
                              className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                              title="Dőlt"
                            >
                              <Italic className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const textarea = document.getElementById('bio-textarea');
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const selected = bioText.substring(start, end);
                                if (selected) {
                                  const newText = bioText.substring(0, start) + `__${selected}__` + bioText.substring(end);
                                  setBioText(newText);
                                }
                              }}
                              className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                              title="Aláhúzott"
                            >
                              <Underline className="h-4 w-4" />
                            </button>
                          </div>
                          <Textarea
                            id="bio-textarea"
                            value={bioText}
                            onChange={(e) => setBioText(e.target.value)}
                            placeholder="Írj magadról valamit... (használj **félkövér**, *dőlt*, __aláhúzott__ formázást)"
                            className="bg-zinc-950 border-zinc-800 focus:border-primary text-white min-h-[100px] resize-none"
                            maxLength={500}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">{bioText.length}/500</span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsEditingBio(false);
                                  setBioText(profile?.bio || "");
                                }}
                                className="border-zinc-700"
                              >
                                Mégse
                              </Button>
                              <Button
                                size="sm"
                                onClick={async () => {
                                  setBioSaving(true);
                                  try {
                                    await api.put("/users/profile", { bio: bioText });
                                    setProfile((prev) => ({ ...prev, bio: bioText }));
                                    setUser((prev) => ({ ...prev, bio: bioText }));
                                    setIsEditingBio(false);
                                    toast.success("Bio mentve!");
                                  } catch (e) {
                                    toast.error("Hiba történt");
                                  } finally {
                                    setBioSaving(false);
                                  }
                                }}
                                disabled={bioSaving}
                                className="bg-primary hover:bg-orange-600"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                {bioSaving ? "Mentés..." : "Mentés"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 max-w-2xl group">
                          {profile?.bio ? (
                            <div 
                              className="break-words text-zinc-400 bio-content"
                              dangerouslySetInnerHTML={{ 
                                __html: formatBio(profile.bio)
                              }}
                            />
                          ) : (
                            <p className="text-zinc-500">
                              {isOwnProfile ? "Még nincs bio megadva." : "Nincs bio."}
                            </p>
                          )}
                          {isOwnProfile && (
                            <button
                              onClick={() => {
                                setBioText(profile?.bio || "");
                                setIsEditingBio(true);
                              }}
                              className="mt-2 flex items-center gap-1 text-sm text-primary hover:text-orange-400 transition-colors"
                            >
                              <Edit3 className="h-3 w-3" />
                              Bio szerkesztése
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isOwnProfile && (
                    <div className="shrink-0">
                      {friendshipStatus === "accepted" && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-green-400">
                            <UserCheck className="h-5 w-5" />
                            Ismerős
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveFriend}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <UserMinus className="h-5 w-5" />
                          </Button>
                        </div>
                      )}

                      {friendshipStatus === "pending" && (
                        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-yellow-400">
                          <Clock className="h-5 w-5" />
                          Függőben
                        </div>
                      )}

                      {friendshipStatus === "none" && (
                        <Button onClick={handleAddFriend}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Ismerős jelölés
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                  <div className="rounded-xl border border-white/5 bg-zinc-950/60 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/5">
                      <FileText className="h-4 w-4 text-zinc-300" />
                    </div>
                    <p className="text-xl font-bold text-white">{posts.length}</p>
                    <p className="text-xs uppercase tracking-wide text-zinc-400">
                      Bejegyzés
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-zinc-950/60 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/5">
                      <Users className="h-4 w-4 text-zinc-300" />
                    </div>
                    <p className="text-xl font-bold text-white">{friends.length}</p>
                    <p className="text-xs uppercase tracking-wide text-zinc-400">
                      Ismerős
                    </p>
                    {!isOwnProfile && mutualFriends.length > 0 && (
                      <p className="mt-1 text-xs text-primary">
                        {mutualFriends.length} közös
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/5 bg-zinc-950/60 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/5">
                      <ImageIcon className="h-4 w-4 text-zinc-300" />
                    </div>
                    <p className="text-xl font-bold text-white">{imagePosts.length}</p>
                    <p className="text-xs uppercase tracking-wide text-zinc-400">
                      Képes poszt
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        <div className="mt-8">
          <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 transition ${
                activeTab === "posts"
                  ? "bg-primary/15 text-primary"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <FileText className="h-4 w-4" />
              Posztok
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("images")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 transition ${
                activeTab === "images"
                  ? "bg-primary/15 text-primary"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Images className="h-4 w-4" />
              Képek
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("friends")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 transition ${
                activeTab === "friends"
                  ? "bg-primary/15 text-primary"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              Ismerősök
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 transition ${
                activeTab === "about"
                  ? "bg-primary/15 text-primary"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Info className="h-4 w-4" />
              Névjegy
            </button>
          </div>

          {activeTab === "posts" && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-8 lg:col-span-2">
                <Card className="border border-white/5 bg-zinc-900">
                  <CardContent className="pt-6">
                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-white">
                        Bejegyzések
                      </h2>
                      <span className="text-sm text-zinc-500">
                        {posts.length} db
                      </span>
                    </div>

                    {posts.length === 0 ? (
                      <div className="rounded-xl border border-white/5 bg-zinc-950/50 py-12 text-center text-zinc-500">
                        Még nincsenek bejegyzések
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {posts.map((post) => (
                          <Card
                            key={post.post_id}
                            className="border border-white/5 bg-zinc-950/50"
                          >
                            <CardContent className="pt-6">
                              <div className="flex items-start gap-3">
                                <Avatar className="h-10 w-10 shrink-0">
                                  <AvatarImage src={imageSrc(profile?.profile_pic)} />
                                  <AvatarFallback className="bg-zinc-800 text-white">
                                    {profile?.username?.charAt(0)?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-white">
                                    {profile?.username}
                                  </p>

                                  <p className="mt-2 break-words text-zinc-300">
                                    {post.content}
                                  </p>

                                  {post.image_base64 && (
                                    <button
                                      type="button"
                                      className="mt-4 block w-full overflow-hidden rounded-xl"
                                      onClick={() =>
                                        openViewer(post.image_base64, "Bejegyzés képe")
                                      }
                                    >
                                      <img
                                        src={post.image_base64}
                                        alt="Post"
                                        className="max-h-[500px] w-full rounded-xl object-cover transition hover:opacity-95"
                                      />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-8 lg:col-span-1">
                <Card className="border border-white/5 bg-zinc-900 lg:sticky lg:top-20">
                  <CardContent className="pt-6">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">Ismerősök</h3>
                      <span className="text-sm text-zinc-500">
                        {friends.length} db
                      </span>
                    </div>

                    {friends.length === 0 ? (
                      <div className="rounded-xl border border-white/5 bg-zinc-950/50 py-8 text-center text-zinc-500">
                        Nincs ismerős
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                        {friends.map((friend) => (
                          <button
                            key={friend.user_id}
                            onClick={() => navigate(`/profile/${friend.user_id}`)}
                            className="rounded-xl border border-white/5 bg-zinc-950/50 p-3 text-left transition hover:bg-zinc-800/70"
                          >
                            <div className="flex flex-col items-center gap-2">
                              <Avatar className="h-16 w-16">
                                <AvatarImage src={imageSrc(friend.profile_pic)} />
                                <AvatarFallback className="bg-zinc-800 text-white">
                                  {friend.username?.charAt(0)?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>

                              <p className="w-full truncate text-center text-sm text-zinc-300">
                                {friend.username}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "images" && (
            <Card className="border border-white/5 bg-zinc-900">
              <CardContent className="pt-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Képek</h2>
                  <span className="text-sm text-zinc-500">
                    {imagePosts.length} db
                  </span>
                </div>

                {imagePosts.length === 0 ? (
                  <div className="rounded-xl border border-white/5 bg-zinc-950/50 py-12 text-center text-zinc-500">
                    Nincsenek képek
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {imagePosts.map((post) => (
                      <button
                        key={post.post_id}
                        type="button"
                        onClick={() => openViewer(post.image_base64, "Kép")}
                        className="block overflow-hidden rounded-xl"
                      >
                        <img
                          src={post.image_base64}
                          alt="Gallery"
                          className="h-44 w-full rounded-xl object-cover transition hover:scale-[1.02] hover:opacity-95"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "friends" && (
            <Card className="border border-white/5 bg-zinc-900">
              <CardContent className="pt-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Ismerősök</h2>
                  <span className="text-sm text-zinc-500">{friends.length} db</span>
                </div>

                {/* Közös ismerősök szekció - csak ha nem saját profil */}
                {!isOwnProfile && mutualFriends.length > 0 && (
                  <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">
                        {mutualFriends.length} közös ismerős
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mutualFriends.slice(0, 6).map((friend) => (
                        <button
                          key={friend.user_id}
                          type="button"
                          onClick={() => navigate(`/profile/${friend.user_id}`)}
                          className="flex items-center gap-2 rounded-full bg-zinc-800/50 px-3 py-1.5 transition hover:bg-zinc-700/50"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={imageSrc(friend.profile_pic)} />
                            <AvatarFallback className="bg-zinc-700 text-white text-xs">
                              {friend.username?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-zinc-300">{friend.username}</span>
                        </button>
                      ))}
                      {mutualFriends.length > 6 && (
                        <span className="flex items-center px-3 py-1.5 text-xs text-zinc-500">
                          +{mutualFriends.length - 6} további
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {friends.length === 0 ? (
                  <div className="rounded-xl border border-white/5 bg-zinc-950/50 py-12 text-center text-zinc-500">
                    Nincs ismerős
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {friends.map((friend) => (
                      <button
                        key={friend.user_id}
                        type="button"
                        onClick={() => navigate(`/profile/${friend.user_id}`)}
                        className={`rounded-xl border p-4 transition hover:bg-zinc-800/70 ${
                          friend.is_mutual 
                            ? "border-primary/30 bg-primary/5" 
                            : "border-white/5 bg-zinc-950/50"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-20 w-20">
                              <AvatarImage src={imageSrc(friend.profile_pic)} />
                              <AvatarFallback className="bg-zinc-800 text-white">
                                {friend.username?.charAt(0)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {friend.online_status === "online" && (
                              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-zinc-900 bg-green-500" />
                            )}
                          </div>

                          <div className="w-full text-center">
                            <p className="truncate text-sm font-medium text-zinc-200">
                              {friend.username}
                            </p>
                            
                            {/* Státusz badge */}
                            {friend.is_me ? (
                              <span className="mt-1 inline-block rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                                Te
                              </span>
                            ) : friend.is_mutual ? (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                                <UserCheck className="h-3 w-3" />
                                Közös ismerős
                              </span>
                            ) : friend.friendship_status === "accepted" ? (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                                <UserCheck className="h-3 w-3" />
                                Ismerősöd
                              </span>
                            ) : friend.friendship_status === "pending" ? (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                                <Clock className="h-3 w-3" />
                                Függőben
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "about" && (
            <Card className="border border-white/5 bg-zinc-900">
              <CardContent className="pt-6">
                <h2 className="mb-5 text-2xl font-bold text-white">Névjegy</h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-white/5 bg-zinc-950/50 p-4">
                    <p className="text-sm uppercase tracking-wide text-zinc-500">
                      Felhasználónév
                    </p>
                    <p className="mt-2 break-words text-white">
                      {profile?.username || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-zinc-950/50 p-4">
                    <p className="text-sm uppercase tracking-wide text-zinc-500">
                      Bio
                    </p>
                    <p className="mt-2 break-words text-white">
                      {profile?.bio || "Nincs megadva"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-zinc-950/50 p-4">
                    <p className="text-sm uppercase tracking-wide text-zinc-500">
                      Bejegyzések száma
                    </p>
                    <p className="mt-2 text-white">{posts.length}</p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-zinc-950/50 p-4">
                    <p className="text-sm uppercase tracking-wide text-zinc-500">
                      Ismerősök száma
                    </p>
                    <p className="mt-2 text-white">{friends.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {openImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 p-2 sm:p-4"
          onClick={closeViewer}
        >
          <div
            className="relative mx-auto flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none bg-zinc-900 sm:h-[95vh] sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <p className="truncate pr-4 text-sm font-semibold text-white sm:text-base">
                {openImageTitle || "Kép megtekintése"}
              </p>

              <button
                type="button"
                onClick={closeViewer}
                className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-2 sm:p-4">
              <img
                src={imageSrc(openImage)}
                alt="Preview"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};