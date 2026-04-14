import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Header } from "../components/Header";
import { FriendsSidebar } from "../components/FriendsSidebar";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

import { toast } from "sonner";
import EmojiPicker from "emoji-picker-react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import {
  ThumbsUp,
  MessageCircle,
  Send,
  Image as ImageIcon,
  Video,
  Trash2,
  Zap,
  Calendar,
  MapPin,
  Flame,
  BadgeCheck,
  X,
  Smile,
  Crop
} from "lucide-react";

import { formatDistanceToNow, format } from "date-fns";
import { hu } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export const Feed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [content, setContent] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [videoBase64, setVideoBase64] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const [emojiPos, setEmojiPos] = useState({ top: 0, left: 0 });
  
  // Image cropping
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 80, aspect: 16/9 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  const [expandedPost, setExpandedPost] = useState(null);
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [commentImage, setCommentImage] = useState({});

  const [highlightedEvents, setHighlightedEvents] = useState([]);
  const [openPost, setOpenPost] = useState(null);

  useEffect(() => {
    fetchPosts();
    fetchHighlightedEvents();

    const interval = setInterval(() => {
      fetchHighlightedEvents();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!openPost) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpenPost(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openPost]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    
    const handleClickOutside = (e) => {
      if (
        emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) &&
        emojiButtonRef.current && !emojiButtonRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  const toggleEmojiPicker = () => {
    if (!showEmojiPicker && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPos({
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - 280),
      });
    }
    setShowEmojiPicker((prev) => !prev);
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/posts/feed");
      setPosts(response.data);

      if (openPost) {
        const updatedOpenPost = response.data.find(
          (post) => post.post_id === openPost.post_id
        );

        if (updatedOpenPost) {
          setOpenPost(updatedOpenPost);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Nem sikerült betölteni a feedet");
    } finally {
      setLoading(false);
    }
  };

  const fetchHighlightedEvents = async () => {
    try {
      const response = await api.get("/events/highlighted");
      setHighlightedEvents(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();

    if (!content.trim() && !imageBase64 && !videoBase64) {
      toast.error("Írj valamit vagy tölts fel képet/videót!");
      return;
    }

    try {
      await api.post("/posts", {
        content,
        image_base64: imageBase64,
        video_base64: videoBase64
      });

      setContent("");
      setImageBase64("");
      setVideoBase64("");

      await fetchPosts();

      toast.success("Bejegyzés létrehozva! Admin jóváhagyásra vár.");
    } catch (error) {
      console.error(error);
      toast.error("Hiba történt");
    }
  };

  const handleImageUpload = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 80 * 1024 * 1024) {
    toast.error("A kép maximum 80MB lehet");
    return;
  }

  const reader = new FileReader();

  reader.onloadend = () => {
    // Eredeti kép preview
    setImageBase64(reader.result);

    // videó törlése ha volt
    setVideoBase64("");
  };

  reader.readAsDataURL(file);
};
  
  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 80 * 1024 * 1024) {
      toast.error("A videó maximum 80MB lehet");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoBase64(reader.result);
      setImageBase64("");
    };
    reader.readAsDataURL(file);
  };

  const onEmojiClick = (emojiObject) => {
    setContent((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const getCroppedImg = useCallback(() => {
  if (!imgRef.current || !completedCrop) return;

  const image = imgRef.current;

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const canvas = document.createElement("canvas");

  // FONTOS: eredeti felbontás használata
  canvas.width = completedCrop.width * scaleX;
  canvas.height = completedCrop.height * scaleY;

  const ctx = canvas.getContext("2d");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    completedCrop.x * scaleX,
    completedCrop.y * scaleY,
    completedCrop.width * scaleX,
    completedCrop.height * scaleY,
    0,
    0,
    completedCrop.width * scaleX,
    completedCrop.height * scaleY
  );

  const base64 = canvas.toDataURL("image/jpeg", 0.95);

  setImageBase64(base64);
  setVideoBase64("");
  setShowCropModal(false);
  setCropSrc(null);
}, [completedCrop]);

  const loadComments = async (postId) => {
    try {
      const response = await api.get(`/posts/${postId}/comments`);

      setComments((prev) => ({
        ...prev,
        [postId]: response.data
      }));
    } catch (error) {
      console.error(error);
      toast.error("Nem sikerült betölteni a kommenteket");
    }
  };

  const openPostModal = async (post) => {
    setOpenPost(post);
    await loadComments(post.post_id);
  };

  const handleReact = async (postId) => {
    try {
      await api.post(`/posts/${postId}/react`, {
        reaction_type: "like"
      });

      await fetchPosts();
      await loadComments(postId);

      if (openPost?.post_id === postId) {
        const response = await api.get("/posts/feed");
        const updatedPost = response.data.find((p) => p.post_id === postId);

        if (updatedPost) {
          setOpenPost(updatedPost);
        }

        setPosts(response.data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Hiba történt");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Biztosan törlöd?")) return;

    try {
      await api.delete(`/posts/${postId}`);

      if (openPost?.post_id === postId) {
        setOpenPost(null);
      }

      await fetchPosts();

      toast.success("Bejegyzés törölve");
    } catch (error) {
      console.error(error);
      toast.error("Hiba történt");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm("Komment törlése?")) return;

    try {
      await api.delete(`/comments/${commentId}`);

      await loadComments(postId);
      await fetchPosts();

      toast.success("Komment törölve");
    } catch (error) {
      console.error(error);
      toast.error("Komment törlése nem sikerült");
    }
  };

  const handleComment = async (postId) => {
    const text = commentText[postId];
    const image = commentImage[postId];

    if (!text?.trim() && !image) return;

    try {
      await api.post(`/posts/${postId}/comment`, {
        content: text || "",
        image_base64: image || ""
      });

      setCommentText((prev) => ({
        ...prev,
        [postId]: ""
      }));
      
      setCommentImage((prev) => ({
        ...prev,
        [postId]: ""
      }));

      await loadComments(postId);
      await fetchPosts();

      toast.success("Komment hozzáadva");
    } catch (error) {
      console.error(error);
      toast.error("Hiba történt");
    }
  };
  
  const handleCommentImageUpload = (postId, file) => {
    if (!file) return;
    
    if (file.size > 80 * 1024 * 1024) {
      toast.error("A kép maximum 80MB lehet");
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setCommentImage((prev) => ({
        ...prev,
        [postId]: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const toggleComments = async (postId) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }

    setExpandedPost(postId);
    await loadComments(postId);
  };

  const visibleHighlightedEvents = highlightedEvents.filter((event) => {
    const now = new Date();

    if (event.end_date) {
      return new Date(event.end_date) > now;
    }

    return new Date(event.date) > now;
  });

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <Header />

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 md:py-8">
        <div className="grid w-full min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="min-w-0 space-y-6 lg:col-span-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1 text-xs uppercase tracking-[0.25em] text-orange-300">
              <Flame className="h-3.5 w-3.5 shrink-0" />
              Community Feed
            </div>

            <Card className="overflow-hidden border border-white/10 bg-zinc-900/80 shadow-lg shadow-black/30 backdrop-blur">
              <CardHeader className="border-b border-white/5">
                <h2 className="font-chakra text-xl font-semibold uppercase text-white md:text-2xl">
                  Bejegyzés létrehozása
                </h2>
              </CardHeader>

              <CardContent className="min-w-0 pt-6">
                <form onSubmit={handleCreatePost} className="space-y-4">
                  <div className="relative">
                    <Textarea
                      placeholder="Mire gondolsz?"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[120px] w-full resize-none border-zinc-800 bg-zinc-950 text-white focus-visible:ring-orange-500/50 pr-10"
                    />
                    <button
                      type="button"
                      ref={emojiButtonRef}
                      onClick={toggleEmojiPicker}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-white transition"
                      data-testid="emoji-picker-toggle"
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    
                    {showEmojiPicker && createPortal(
                      <div
                        ref={emojiPickerRef}
                        data-testid="emoji-picker-popup"
                        className="rounded-xl overflow-hidden shadow-2xl border border-zinc-700"
                        style={{
                          position: 'fixed',
                          top: emojiPos.top,
                          left: emojiPos.left,
                          zIndex: 9999,
                        }}
                      >
                        <EmojiPicker
                          onEmojiClick={onEmojiClick}
                          theme="dark"
                          width={280}
                          height={350}
                          emojiStyle="native"
                          searchPlaceholder="Keresés..."
                          skinTonesDisabled
                          previewConfig={{ showPreview: false }}
                          lazyLoadEmojis={true}
                          emojiSize={24}
                          suggestedEmojisMode="none"
                        />
                      </div>,
                      document.body
                    )}
                  </div>

                  {imageBase64 && (
                    <div className="relative">
                      <img
                        src={imageBase64}
                        className="w-full max-w-full max-h-[420px] rounded-xl border border-white/10 object-cover"
                        alt="preview"
                      />
                      <button
                        type="button"
                        onClick={() => setImageBase64("")}
                        className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                          {/* Vágás gomb */}
                      <button
                        type="button"
                        onClick={() => {
                        setCropSrc(imageBase64);
                        setShowCropModal(true);
                        }}
                        className="absolute bottom-2 right-2 bg-primary rounded-full p-2 hover:bg-orange-600 flex items-center gap-1"
                        >
                        <Crop className="h-4 w-4 text-white" />
                        Vágás
                      </button>
                    </div>
                  )}
                  
                  {videoBase64 && (
                    <div className="relative">
                      <video
                        src={videoBase64}
                        controls
                        className="w-full max-h-[420px] rounded-xl border border-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => setVideoBase64("")}
                        className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-800 px-4 py-2 transition hover:bg-zinc-700">
                        <ImageIcon className="h-4 w-4 shrink-0" />
                        Kép
                      </div>
                    </label>
                    
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-800 px-4 py-2 transition hover:bg-zinc-700">
                        <Video className="h-4 w-4 shrink-0" />
                        Videó
                      </div>
                    </label>

                    <Button
                      type="submit"
                      className="bg-primary hover:bg-orange-600 sm:ml-auto"
                    >
                      <Send className="mr-2 h-4 w-4 shrink-0" />
                      Közzététel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-xl bg-zinc-900"
                  />
                ))}
              </div>
            ) : (
              posts.map((post) => (
                <Card
                  key={post.post_id}
                  className="overflow-hidden border border-white/10 bg-zinc-900/80 shadow-lg transition hover:border-orange-500/20"
                >
                  <CardHeader className="pb-4">
                    <div className="flex min-w-0 justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${post.user_id}`)}
                          className="shrink-0"
                        >
                          <Avatar className="hover:ring-2 hover:ring-primary transition">
                            <AvatarImage src={post.profile_pic} />
                            <AvatarFallback>{post.username?.[0]}</AvatarFallback>
                          </Avatar>
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/profile/${post.user_id}`)}
                              className="max-w-[180px] truncate font-semibold text-white hover:text-primary transition sm:max-w-none text-left"
                            >
                              {post.username}
                            </button>

                            {post.user_id === user?.user_id && (
                              <span className="flex items-center gap-1 text-xs text-orange-400">
                                <BadgeCheck className="h-3 w-3 shrink-0" />
                                Te
                              </span>
                            )}
                            
                            {post.status === "pending" && (
                              <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">
                                Jóváhagyásra vár
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-zinc-500">
                            {formatDistanceToNow(new Date(post.created_at), {
                              addSuffix: true,
                              locale: hu
                            })}
                          </p>
                        </div>
                      </div>

                      {(post.user_id === user?.user_id || user?.role === 1) && (
                        <button
                          onClick={() => handleDeletePost(post.post_id)}
                          className="shrink-0 text-zinc-500 hover:text-red-500"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="min-w-0 space-y-4">
                    <p className="break-words text-zinc-200">{post.content}</p>

                    {post.image_base64 && (
                      <button
                        type="button"
                        onClick={() => openPostModal(post)}
                        className="block w-full overflow-hidden rounded-xl"
                      >
                        <img
                          src={post.image_base64}
                          className="h-auto max-h-[420px] w-full max-w-full rounded-xl object-cover transition hover:opacity-95"
                          alt="post"
                        />
                      </button>
                    )}
                    
                    {post.video_base64 && (
                      <video
                        src={post.video_base64}
                        controls
                        className="h-auto max-h-[420px] w-full max-w-full rounded-xl"
                      />
                    )}

                    <div className="flex flex-wrap gap-6 border-t border-white/10 pt-4">
                      <button
                        onClick={() => handleReact(post.post_id)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-orange-400"
                        type="button"
                      >
                        <ThumbsUp className="h-4 w-4 shrink-0" />
                        {post.reaction_count}
                      </button>

                      <button
                        onClick={() => toggleComments(post.post_id)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-orange-400"
                        type="button"
                      >
                        <MessageCircle className="h-4 w-4 shrink-0" />
                        {post.comment_count}
                      </button>
                    </div>

                    {expandedPost === post.post_id && (
                      <div className="space-y-3 border-t border-white/10 pt-4">
                        {comments[post.post_id]?.length > 0 ? (
                          comments[post.post_id].map((comment) => (
                            <div
                              key={comment.comment_id}
                              className="flex min-w-0 gap-2"
                            >
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={comment.profile_pic} />
                                <AvatarFallback>
                                  {comment.username?.[0]}
                                </AvatarFallback>
                              </Avatar>

                              <div className="relative min-w-0 flex-1 rounded-xl bg-zinc-800 p-3 break-words">
                                <p className="pr-8 text-sm font-semibold text-white break-words">
                                  {comment.username}
                                </p>

                                <p className="text-sm break-words whitespace-pre-wrap text-zinc-300">
                                  {comment.content}
                                </p>
                                
                                {comment.image_base64 && (
                                  <img 
                                    src={comment.image_base64} 
                                    alt="Komment kép" 
                                    className="mt-2 max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90"
                                    onClick={() => setOpenPost({...post, viewImage: comment.image_base64})}
                                  />
                                )}

                                {(comment.user_id === user?.user_id ||
                                  user?.role === 1) && (
                                  <button
                                    onClick={() =>
                                      handleDeleteComment(
                                        post.post_id,
                                        comment.comment_id
                                      )
                                    }
                                    className="absolute right-2 top-2 text-zinc-400 hover:text-red-500"
                                    type="button"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-zinc-500">
                            Még nincs komment.
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          {commentImage[post.post_id] && (
                            <div className="relative">
                              <img 
                                src={commentImage[post.post_id]} 
                                alt="Előnézet" 
                                className="max-h-32 rounded-lg object-cover"
                              />
                              <button
                                onClick={() => setCommentImage(prev => ({...prev, [post.post_id]: ""}))}
                                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                                type="button"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Írj kommentet..."
                              value={commentText[post.post_id] || ""}
                              onChange={(e) =>
                                setCommentText((prev) => ({
                                  ...prev,
                                  [post.post_id]: e.target.value
                                }))
                              }
                              className="w-full max-w-full resize-none border-zinc-800 bg-zinc-950 text-white"
                            />

                            <div className="flex flex-col gap-1">
                              <label className="cursor-pointer rounded-md bg-zinc-800 p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white transition">
                                <ImageIcon className="h-4 w-4" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleCommentImageUpload(post.post_id, e.target.files?.[0])}
                                />
                              </label>
                              
                              <Button
                                onClick={() => handleComment(post.post_id)}
                                type="button"
                                size="sm"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="space-y-6 lg:col-span-4">
            <Card className="border border-white/10 bg-zinc-900">
              <CardHeader>
                <h3 className="flex items-center gap-2 font-bold text-white">
                  <Zap className="h-5 w-5 text-primary" />
                  Kiemelt események
                </h3>
              </CardHeader>

              <CardContent className="space-y-4">
                {visibleHighlightedEvents.length > 0 ? (
                  visibleHighlightedEvents.map((event) => (
                    <div
                      key={event.event_id}
                      onClick={() => navigate("/events")}
                      className="cursor-pointer rounded-xl bg-zinc-800 p-4 transition hover:bg-zinc-700"
                    >
                      <h4 className="break-words font-bold text-white">
                        {event.title}
                      </h4>

                      <div className="mt-2 flex gap-2 text-xs text-zinc-400">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {format(new Date(event.date), "MMM d.", {
                          locale: hu
                        })}
                      </div>

                      <div className="flex gap-2 text-xs text-zinc-400">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="break-words">{event.city}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-zinc-500">
                    Jelenleg nincs aktív kiemelt esemény.
                  </div>
                )}
              </CardContent>
            </Card>

            <FriendsSidebar />
          </div>
        </div>
      </div>
      {openPost && (
        <div className="fixed inset-0 z-50 bg-black/90 p-0 sm:p-4">
          <div
            className="mx-auto flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-zinc-900 sm:h-[95vh] sm:rounded-xl md:grid md:grid-cols-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-h-0 items-center justify-center bg-black md:h-[95vh]">
              <img
                src={openPost.image_base64}
                className="h-auto max-h-[40vh] w-full object-contain sm:max-h-[50vh] md:h-full md:max-h-[95vh]"
                alt="full post"
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col border-t border-white/10 md:h-[95vh] md:border-l md:border-t-0">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="shrink-0">
                    <AvatarImage src={openPost.profile_pic} />
                    <AvatarFallback>{openPost.username?.[0]}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-white">
                        {openPost.username}
                      </p>

                      {openPost.user_id === user?.user_id && (
                        <span className="flex items-center gap-1 text-xs text-orange-400">
                          <BadgeCheck className="h-3 w-3 shrink-0" />
                          Te
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-500">
                      {formatDistanceToNow(new Date(openPost.created_at), {
                        addSuffix: true,
                        locale: hu
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(openPost.user_id === user?.user_id || user?.role === 1) && (
                    <button
                      onClick={() => handleDeletePost(openPost.post_id)}
                      className="text-zinc-400 hover:text-red-500"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setOpenPost(null)}
                    className="text-zinc-400 hover:text-white"
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="border-b border-white/10 p-4">
                <p className="break-words text-zinc-200">{openPost.content}</p>
              </div>

              <div className="flex flex-wrap gap-6 border-b border-white/10 p-4">
                <button
                  onClick={() => handleReact(openPost.post_id)}
                  className="flex items-center gap-2 text-zinc-400 hover:text-orange-400"
                  type="button"
                >
                  <ThumbsUp className="h-4 w-4 shrink-0" />
                  {posts.find((p) => p.post_id === openPost.post_id)
                    ?.reaction_count ?? openPost.reaction_count}
                </button>

                <div className="flex items-center gap-2 text-zinc-400">
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  {posts.find((p) => p.post_id === openPost.post_id)
                    ?.comment_count ?? openPost.comment_count}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {comments[openPost.post_id]?.length > 0 ? (
                    comments[openPost.post_id].map((comment) => (
                      <div
                        key={comment.comment_id}
                        className="flex min-w-0 gap-2"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={comment.profile_pic} />
                          <AvatarFallback>
                            {comment.username?.[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="relative min-w-0 flex-1 rounded-xl bg-zinc-800 p-3 break-words">
                          <p className="pr-8 text-sm font-semibold text-white break-words">
                            {comment.username}
                          </p>

                          <p className="text-sm break-words whitespace-pre-wrap text-zinc-300">
                            {comment.content}
                          </p>

                          {(comment.user_id === user?.user_id ||
                            user?.role === 1) && (
                            <button
                              onClick={() =>
                                handleDeleteComment(
                                  openPost.post_id,
                                  comment.comment_id
                                )
                              }
                              className="absolute right-2 top-2 text-zinc-400 hover:text-red-500"
                              type="button"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-zinc-500">
                      Még nincs komment.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-white/10 bg-zinc-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Textarea
                    placeholder="Írj kommentet..."
                    value={commentText[openPost.post_id] || ""}
                    onChange={(e) =>
                      setCommentText((prev) => ({
                        ...prev,
                        [openPost.post_id]: e.target.value
                      }))
                    }
                    className="min-h-[90px] w-full max-w-full resize-none border-zinc-800 bg-zinc-950 text-white"
                  />

                  <Button
                    onClick={() => handleComment(openPost.post_id)}
                    type="button"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setOpenPost(null)}
            className="absolute inset-0 -z-10 h-full w-full cursor-default"
            type="button"
            aria-label="Bezárás"
          />
        </div>
      )}
      
      {/* Kép vágás modal */}
      {showCropModal && cropSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Crop className="h-5 w-5" />
                Kép vágása
              </h3>
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setCropSrc(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={undefined}
              >
                <img
                  ref={imgRef}
                  src={cropSrc}
                  alt="Crop"
                  className="max-h-[60vh] w-auto"
                />
              </ReactCrop>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  // Eredeti kép használata vágás nélkül
                  setImageBase64(cropSrc);
                  setVideoBase64("");
                  setShowCropModal(false);
                  setCropSrc(null);
                }}
              >
                Eredeti használata
              </Button>
              <Button onClick={getCroppedImg} className="bg-primary hover:bg-orange-600">
                Vágás alkalmazása
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};