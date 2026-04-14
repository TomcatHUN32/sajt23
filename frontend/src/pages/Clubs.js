import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Lock, Globe, X, Image as ImageIcon, Crown, Shield } from 'lucide-react';

export const Clubs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', cover_image: '', logo_image: '', is_public: true });

  useEffect(() => { fetchClubs(); }, []);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clubs');
      setClubs(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Add meg a klub nevét!'); return; }
    try {
      await api.post('/clubs', form);
      toast.success('Klub létrehozva! Admin jóváhagyásra vár.');
      setShowCreate(false);
      setForm({ name: '', description: '', cover_image: '', logo_image: '', is_public: true });
      fetchClubs();
    } catch (e) { toast.error('Hiba történt'); }
  };

  const handleImageUpload = (field) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 80 * 1024 * 1024) { toast.error('Max 80MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setForm(prev => ({ ...prev, [field]: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleJoin = async (clubId) => {
    try {
      const res = await api.post(`/clubs/${clubId}/join`);
      toast.success(res.data.message);
      fetchClubs();
    } catch (e) { toast.error(e.response?.data?.detail || 'Hiba'); }
  };

  const handleLeave = async (clubId) => {
    if (!window.confirm('Biztosan kilépsz?')) return;
    try {
      await api.post(`/clubs/${clubId}/leave`);
      toast.success('Kiléptél a klubból');
      fetchClubs();
    } catch (e) { toast.error(e.response?.data?.detail || 'Hiba'); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="font-chakra text-3xl font-bold uppercase text-white" data-testid="clubs-heading">Autós Klubok</h1>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-orange-600" data-testid="create-club-btn">
            <Plus className="w-4 h-4 mr-2" />Klub létrehozása
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-zinc-900 rounded-xl animate-pulse" />)}
          </div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">Még nincsenek klubok. Hozz létre egyet!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubs.map(club => (
              <Card key={club.club_id} className={`bg-zinc-900/80 border-white/10 hover:border-primary/30 transition overflow-hidden ${club.status === 'pending' ? 'opacity-75 border-yellow-500/30' : ''}`}
                data-testid="club-card">
                <div className="relative h-32 bg-zinc-800">
                  {club.cover_image ? (
                    <img src={club.cover_image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
                  )}
                  <div className="absolute -bottom-6 left-4">
                    <div className="w-14 h-14 rounded-xl border-2 border-zinc-900 overflow-hidden bg-zinc-800">
                      {club.logo_image ? (
                        <img src={club.logo_image} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xl">
                          {club.name?.[0]}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {club.status === 'pending' && (
                      <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full">
                        Jóváhagyásra vár
                      </span>
                    )}
                    {club.is_public ? (
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Globe className="w-3 h-3" />Nyilvános
                      </span>
                    ) : (
                      <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" />Privát
                      </span>
                    )}
                  </div>
                </div>
                <CardContent className="pt-8 pb-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-white text-lg">{club.name}</h3>
                    <p className="text-sm text-zinc-400 line-clamp-2 mt-1">{club.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{club.members_count || 0} tag</span>
                    <span className="text-xs text-zinc-500">Alapító: {club.owner_username}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => navigate(`/clubs/${club.club_id}`)} variant="outline"
                      className="flex-1 border-zinc-700 text-zinc-300 hover:text-white" data-testid="view-club-btn">
                      Megtekintés
                    </Button>
                    {club.membership_status === 'none' && (
                      <Button onClick={() => handleJoin(club.club_id)} className="flex-1 bg-primary hover:bg-orange-600" data-testid="join-club-btn">
                        Csatlakozás
                      </Button>
                    )}
                    {club.membership_status === 'pending' && (
                      <Button disabled className="flex-1 bg-yellow-600/20 text-yellow-400">Függőben</Button>
                    )}
                    {club.membership_status === 'approved' && club.membership_role !== 'owner' && (
                      <Button onClick={() => handleLeave(club.club_id)} variant="outline"
                        className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10">
                        Kilépés
                      </Button>
                    )}
                    {club.membership_role === 'owner' && (
                      <span className="flex items-center gap-1 text-xs text-primary px-3">
                        <Crown className="w-3 h-3" />Tulajdonos
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Club Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-chakra text-2xl font-bold text-white">Klub létrehozása</h2>
              <button onClick={() => setShowCreate(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Klub neve *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="pl. Budapest JDM Club" className="bg-zinc-800 border-zinc-700" data-testid="club-name-input" /></div>
              <div><Label>Leírás</Label>
                <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Miről szól a klub?" className="bg-zinc-800 border-zinc-700 min-h-[80px]" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Logó</Label>
                  <label className="mt-1 block w-full h-24 bg-zinc-800 border-2 border-dashed border-zinc-600 rounded-lg cursor-pointer hover:border-primary flex items-center justify-center overflow-hidden">
                    {form.logo_image ? <img src={form.logo_image} alt="" className="w-full h-full object-cover" /> :
                      <ImageIcon className="w-6 h-6 text-zinc-500" />}
                    <input type="file" accept="image/*" onChange={handleImageUpload('logo_image')} className="hidden" />
                  </label>
                </div>
                <div>
                  <Label>Borítókép</Label>
                  <label className="mt-1 block w-full h-24 bg-zinc-800 border-2 border-dashed border-zinc-600 rounded-lg cursor-pointer hover:border-primary flex items-center justify-center overflow-hidden">
                    {form.cover_image ? <img src={form.cover_image} alt="" className="w-full h-full object-cover" /> :
                      <ImageIcon className="w-6 h-6 text-zinc-500" />}
                    <input type="file" accept="image/*" onChange={handleImageUpload('cover_image')} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label>Típus:</Label>
                <button type="button" onClick={() => setForm({...form, is_public: true})}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${form.is_public ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Globe className="w-4 h-4" />Nyilvános
                </button>
                <button type="button" onClick={() => setForm({...form, is_public: false})}
                  className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${!form.is_public ? 'bg-yellow-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Lock className="w-4 h-4" />Privát
                </button>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-orange-600 font-bold" data-testid="submit-club-btn">
                Klub létrehozása
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
