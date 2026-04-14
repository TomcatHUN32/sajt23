import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from 'sonner';
import {
  Users, Send, Crown, Shield, Image as ImageIcon, Video, Trash2,
  X, Check, UserPlus, LogOut, Globe, Lock, Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';

export const ClubDetail = () => {
  const { clubId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState('');

  useEffect(() => { fetchAll(); }, [clubId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const clubRes = await api.get(`/clubs/${clubId}`);
      setClub(clubRes.data);

      const membersRes = await api.get(`/clubs/${clubId}/members`);
      setMembers(membersRes.data);

      if (clubRes.data.membership_role === 'owner' || clubRes.data.membership_role === 'admin' || user?.role === 1) {
        try {
          const pendingRes = await api.get(`/clubs/${clubId}/pending-members`);
          setPendingMembers(pendingRes.data);
        } catch (e) {}
      }

      if (clubRes.data.membership_status === 'approved' || user?.role === 1) {
        try {
          const postsRes = await api.get(`/clubs/${clubId}/posts`);
          setPosts(postsRes.data);
        } catch (e) {}
      }
    } catch (e) {
      toast.error('Nem sikerült betölteni a klubot');
      navigate('/clubs');
    }
    finally { setLoading(false); }
  };

  const handlePost = async () => {
    if (!postContent.trim() && !postImage) return;
    try {
      await api.post(`/clubs/${clubId}/posts`, { content: postContent, image_base64: postImage });
      toast.success('Poszt létrehozva');
      setPostContent('');
      setPostImage('');
      fetchAll();
    } catch (e) { toast.error('Hiba'); }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Biztosan törlöd?')) return;
    try {
      await api.delete(`/clubs/${clubId}/posts/${postId}`);
      toast.success('Poszt törölve');
      fetchAll();
    } catch (e) { toast.error('Hiba'); }
  };

  const handleApproveMember = async (userId) => {
    try {
      await api.put(`/clubs/${clubId}/members/${userId}/approve`);
      toast.success('Tag jóváhagyva');
      fetchAll();
    } catch (e) { toast.error('Hiba'); }
  };

  const handleRejectMember = async (userId) => {
    try {
      await api.put(`/clubs/${clubId}/members/${userId}/reject`);
      toast.success('Jelentkezés elutasítva');
      fetchAll();
    } catch (e) { toast.error('Hiba'); }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/clubs/${clubId}/members/${userId}/role?role=${role}`);
      toast.success('Role frissítve');
      fetchAll();
    } catch (e) { toast.error('Hiba'); }
  };

  const handleJoin = async () => {
    try {
      const res = await api.post(`/clubs/${clubId}/join`);
      toast.success(res.data.message);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Hiba'); }
  };

  const handleLeave = async () => {
    if (!window.confirm('Biztosan kilépsz?')) return;
    try {
      await api.post(`/clubs/${clubId}/leave`);
      toast.success('Kiléptél');
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Hiba'); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 80 * 1024 * 1024) { toast.error('Max 80MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setPostImage(reader.result);
    reader.readAsDataURL(file);
  };

  const isMember = club?.membership_status === 'approved';
  const isAdmin = club?.membership_role === 'owner' || club?.membership_role === 'admin' || user?.role === 1;

  if (loading) return (
    <div className="min-h-screen bg-background"><Header />
      <div className="max-w-4xl mx-auto px-4 py-8"><div className="h-48 bg-zinc-900 rounded-xl animate-pulse" /></div>
    </div>
  );

  if (!club) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Club Header */}
        <div className="relative rounded-xl overflow-hidden">
          <div className="h-48 bg-zinc-800">
            {club.cover_image && <img src={club.cover_image} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="bg-zinc-900 p-4 pt-0">
            <div className="flex items-end gap-4 -mt-8">
              <div className="w-20 h-20 rounded-xl border-4 border-zinc-900 bg-zinc-800 overflow-hidden shrink-0">
                {club.logo_image ? <img src={club.logo_image} alt="" className="w-full h-full object-cover" /> :
                  <div className="w-full h-full flex items-center justify-center text-primary text-3xl font-bold">{club.name?.[0]}</div>}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-2xl font-bold text-white truncate">{club.name}</h1>
                <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
                  <span className="flex items-center gap-1">
                    {club.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {club.is_public ? 'Nyilvános' : 'Privát'}
                  </span>
                  <span>{club.members_count} tag</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!isMember && club.membership_status === 'none' && (
                  <Button onClick={handleJoin} className="bg-primary hover:bg-orange-600" data-testid="join-btn">
                    <UserPlus className="w-4 h-4 mr-2" />Csatlakozás
                  </Button>
                )}
                {club.membership_status === 'pending' && (
                  <Button disabled className="bg-yellow-600/20 text-yellow-400">Függőben</Button>
                )}
                {isMember && club.membership_role !== 'owner' && (
                  <Button onClick={handleLeave} variant="outline" className="border-red-500/30 text-red-400">
                    <LogOut className="w-4 h-4 mr-2" />Kilépés
                  </Button>
                )}
              </div>
            </div>
            {club.description && <p className="text-zinc-400 mt-3 text-sm">{club.description}</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
          {['posts', 'members'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition ${
                activeTab === tab ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'}`}
              data-testid={`tab-${tab}`}>
              {tab === 'posts' ? 'Posztok' : `Tagok (${members.length})`}
            </button>
          ))}
          {isAdmin && (
            <button onClick={() => setActiveTab('manage')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition ${
                activeTab === 'manage' ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'}`}>
              <Settings className="w-4 h-4 inline mr-1" />Kezelés
            </button>
          )}
        </div>

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {isMember && (
              <Card className="bg-zinc-900/80 border-white/10">
                <CardContent className="pt-4 space-y-3">
                  <Textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                    placeholder="Írj valamit a klubban..." className="bg-zinc-800 border-zinc-700 text-white" />
                  {postImage && (
                    <div className="relative inline-block">
                      <img src={postImage} alt="" className="max-h-32 rounded" />
                      <button onClick={() => setPostImage('')} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                        <X className="w-3 h-3 text-white" /></button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <label className="cursor-pointer bg-zinc-800 px-3 py-2 rounded-lg text-zinc-400 hover:text-white flex items-center gap-1">
                      <ImageIcon className="w-4 h-4" />Kép
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    <Button onClick={handlePost} className="bg-primary hover:bg-orange-600 ml-auto" data-testid="club-post-btn">
                      <Send className="w-4 h-4 mr-2" />Közzététel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isMember && user?.role !== 1 ? (
              <div className="text-center py-12 text-zinc-500">Csatlakozz a klubhoz a posztok megtekintéséhez!</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">Még nincsenek posztok</div>
            ) : (
              posts.map(post => (
                <Card key={post.post_id} className="bg-zinc-900/80 border-white/10">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={post.profile_pic} />
                          <AvatarFallback>{post.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <button onClick={() => navigate(`/profile/${post.user_id}`)}
                            className="text-sm font-semibold text-white hover:text-primary">{post.username}</button>
                          <p className="text-xs text-zinc-500">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: hu })}
                          </p>
                        </div>
                      </div>
                      {(post.user_id === user?.user_id || isAdmin) && (
                        <button onClick={() => handleDeletePost(post.post_id)} className="text-zinc-500 hover:text-red-500">
                          <Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                    <p className="text-zinc-300 whitespace-pre-wrap break-words">{post.content}</p>
                    {post.image_base64 && <img src={post.image_base64} alt="" className="rounded-xl max-h-96 object-cover" />}
                    {post.video_base64 && <video src={post.video_base64} controls className="rounded-xl max-h-96" />}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <Card className="bg-zinc-900/80 border-white/10">
            <CardContent className="pt-4 space-y-2">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={m.profile_pic} />
                      <AvatarFallback>{m.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <button onClick={() => navigate(`/profile/${m.user_id}`)}
                        className="font-semibold text-white hover:text-primary text-sm">{m.username}</button>
                      <div className="flex items-center gap-1 text-xs">
                        {m.role === 'owner' && <span className="text-primary flex items-center gap-1"><Crown className="w-3 h-3" />Tulajdonos</span>}
                        {m.role === 'admin' && <span className="text-blue-400 flex items-center gap-1"><Shield className="w-3 h-3" />Admin</span>}
                        {m.role === 'member' && <span className="text-zinc-500">Tag</span>}
                      </div>
                    </div>
                  </div>
                  {isAdmin && m.role !== 'owner' && m.user_id !== user?.user_id && (
                    <select value={m.role} onChange={e => handleRoleChange(m.user_id, e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 text-white rounded px-2 py-1 text-xs">
                      <option value="member">Tag</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && isAdmin && (
          <div className="space-y-4">
            {pendingMembers.length > 0 && (
              <Card className="bg-zinc-900/80 border-white/10">
                <CardContent className="pt-4">
                  <h3 className="font-bold text-white mb-3">Függőben lévő jelentkezések ({pendingMembers.length})</h3>
                  <div className="space-y-2">
                    {pendingMembers.map(m => (
                      <div key={m.user_id} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8"><AvatarFallback>{m.username?.[0]}</AvatarFallback></Avatar>
                          <span className="text-white font-semibold text-sm">{m.username}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApproveMember(m.user_id)} className="bg-green-600 hover:bg-green-700 h-7">
                            <Check className="w-3 h-3 mr-1" />Elfogad
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectMember(m.user_id)} className="h-7">
                            <X className="w-3 h-3 mr-1" />Elutasít
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {pendingMembers.length === 0 && (
              <div className="text-center py-8 text-zinc-500">Nincs függőben lévő jelentkezés</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
