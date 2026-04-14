import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Search, Heart, Plus, MapPin, Tag, Filter,
  Eye, X, Image as ImageIcon, Trash2, ChevronDown
} from 'lucide-react';

const CATEGORIES = [
  'Autók', 'Felnik', 'Motor alkatrészek', 'Tuning alkatrészek',
  'Body kit elemek', 'Elektronikai alkatrészek', 'Egyéb autós kiegészítők'
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Legújabb' },
  { value: 'cheapest', label: 'Legolcsóbb' },
  { value: 'expensive', label: 'Legdrágább' },
  { value: 'popular', label: 'Legnépszerűbb' }
];

export const Marketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [sort, setSort] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [form, setForm] = useState({
    title: '', description: '', price: '', category: CATEGORIES[0],
    condition: 'used', location: '', images: []
  });

  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => { fetchListings(); }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (condition) params.append('condition', condition);
      if (sort) params.append('sort', sort);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      const res = await api.get(`/marketplace/listings?${params.toString()}`);
      setListings(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchFavorites = async () => {
    try {
      const res = await api.get('/marketplace/favorites');
      setFavorites(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.location) {
      toast.error('Cím, ár és helyszín kötelező!');
      return;
    }
    try {
      await api.post('/marketplace/listings', {
        ...form,
        price: parseFloat(form.price)
      });
      toast.success('Hirdetés létrehozva!');
      setShowCreate(false);
      setForm({ title: '', description: '', price: '', category: CATEGORIES[0], condition: 'used', location: '', images: [] });
      fetchListings();
    } catch (e) { toast.error('Hiba történt'); }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (form.images.length + files.length > 10) {
      toast.error('Maximum 10 kép!');
      return;
    }
    files.forEach(file => {
      if (file.size > 80 * 1024 * 1024) { toast.error('Max 80MB/kép'); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, images: [...prev.images, reader.result] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const toggleFavorite = async (listingId) => {
    try {
      const res = await api.post(`/marketplace/listings/${listingId}/favorite`);
      toast.success(res.data.message);
      if (showFavorites) fetchFavorites();
      else fetchListings();
    } catch (e) { toast.error('Hiba'); }
  };

  const handleDelete = async (listingId) => {
    if (!window.confirm('Biztosan törlöd?')) return;
    try {
      await api.delete(`/marketplace/listings/${listingId}`);
      toast.success('Hirdetés törölve');
      setSelectedListing(null);
      fetchListings();
    } catch (e) { toast.error('Hiba'); }
  };

  const openListing = async (listingId) => {
    try {
      const res = await api.get(`/marketplace/listings/${listingId}`);
      setSelectedListing(res.data);
    } catch (e) { toast.error('Nem sikerült betölteni'); }
  };

  const displayListings = showFavorites ? favorites : listings;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary" />
            <h1 className="font-chakra text-3xl font-bold uppercase text-white" data-testid="marketplace-heading">Piactér</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setShowFavorites(!showFavorites); if (!showFavorites) fetchFavorites(); }}
              variant={showFavorites ? "default" : "outline"}
              className={showFavorites ? "bg-red-600 hover:bg-red-700" : "border-zinc-700 text-zinc-300"}
              data-testid="favorites-toggle">
              <Heart className="w-4 h-4 mr-2" />Kedvencek
            </Button>
            <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-orange-600" data-testid="create-listing-btn">
              <Plus className="w-4 h-4 mr-2" />Hirdetés feladása
            </Button>
          </div>
        </div>

        {!showFavorites && (
          <Card className="bg-zinc-900/50 border-white/5">
            <CardContent className="pt-4">
              <form onSubmit={handleSearch} className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Keresés..." className="bg-zinc-800 border-zinc-700 flex-1" data-testid="search-input" />
                  <Button type="submit" className="bg-primary hover:bg-orange-600" data-testid="search-btn">
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)}
                    className="border-zinc-700 text-zinc-300">
                    <Filter className="w-4 h-4 mr-1" /><ChevronDown className="w-3 h-3" />
                  </Button>
                </div>
                {showFilters && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm">
                      <option value="">Minden kategória</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={condition} onChange={(e) => setCondition(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm">
                      <option value="">Minden állapot</option>
                      <option value="new">Új</option>
                      <option value="used">Használt</option>
                    </select>
                    <Input type="number" placeholder="Min ár" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-sm" />
                    <Input type="number" placeholder="Max ár" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-sm" />
                    <select value={sort} onChange={(e) => setSort(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm">
                      {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-zinc-900 rounded-xl animate-pulse" />)}
          </div>
        ) : displayListings.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            {showFavorites ? 'Nincsenek kedvenc hirdetéseid' : 'Nincs találat'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayListings.map(listing => (
              <Card key={listing.listing_id} className="bg-zinc-900/80 border-white/10 hover:border-primary/30 transition cursor-pointer overflow-hidden"
                onClick={() => openListing(listing.listing_id)} data-testid="listing-card">
                {listing.images?.[0] ? (
                  <img src={listing.images[0]} alt={listing.title} className="w-full h-48 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-48 bg-zinc-800 flex items-center justify-center">
                    <ShoppingBag className="w-12 h-12 text-zinc-600" />
                  </div>
                )}
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-bold text-white truncate">{listing.title}</h3>
                  <p className="text-2xl font-bold text-primary">{listing.price?.toLocaleString()} Ft</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{listing.category}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.location}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{listing.condition === 'new' ? 'Új' : 'Használt'}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{listing.views_count || 0}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Listing Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-chakra text-2xl font-bold text-white">Hirdetés feladása</h2>
              <button onClick={() => setShowCreate(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><Label>Cím *</Label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="bg-zinc-800 border-zinc-700" data-testid="listing-title-input" /></div>
              <div><Label>Leírás</Label>
                <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="bg-zinc-800 border-zinc-700 min-h-[100px]" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Ár (Ft) *</Label>
                  <Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                    className="bg-zinc-800 border-zinc-700" data-testid="listing-price-input" /></div>
                <div><Label>Helyszín *</Label>
                  <Input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                    placeholder="pl. Budapest" className="bg-zinc-800 border-zinc-700" data-testid="listing-location-input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Kategória</Label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><Label>Állapot</Label>
                  <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2">
                    <option value="new">Új</option><option value="used">Használt</option>
                  </select></div>
              </div>
              <div>
                <Label>Képek (max 10)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative w-20 h-20">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded" />
                      <button type="button" onClick={() => setForm(p => ({...p, images: p.images.filter((_, j) => j !== i)}))}
                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
                    </div>
                  ))}
                  {form.images.length < 10 && (
                    <label className="w-20 h-20 bg-zinc-800 border-2 border-dashed border-zinc-600 rounded flex items-center justify-center cursor-pointer hover:border-primary">
                      <ImageIcon className="w-6 h-6 text-zinc-500" />
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-orange-600 font-bold" data-testid="submit-listing-btn">
                Hirdetés feladása
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Listing Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="relative">
              {selectedListing.images?.length > 0 ? (
                <img src={selectedListing.images[0]} alt="" className="w-full h-64 md:h-80 object-cover rounded-t-xl" />
              ) : (
                <div className="w-full h-64 bg-zinc-800 rounded-t-xl flex items-center justify-center">
                  <ShoppingBag className="w-16 h-16 text-zinc-600" />
                </div>
              )}
              <button onClick={() => setSelectedListing(null)}
                className="absolute top-3 right-3 bg-black/50 rounded-full p-2 text-white hover:bg-black/70">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedListing.title}</h2>
                  <p className="text-3xl font-bold text-primary mt-1">{selectedListing.price?.toLocaleString()} Ft</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => toggleFavorite(selectedListing.listing_id)}
                    className={selectedListing.is_favorited ? 'border-red-500 text-red-500' : 'border-zinc-700 text-zinc-300'}>
                    <Heart className={`w-4 h-4 ${selectedListing.is_favorited ? 'fill-red-500' : ''}`} />
                  </Button>
                  {(selectedListing.user_id === user?.user_id || user?.role === 1) && (
                    <Button variant="destructive" onClick={() => handleDelete(selectedListing.listing_id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="bg-zinc-800 px-3 py-1 rounded-full text-zinc-300 flex items-center gap-1">
                  <Tag className="w-3 h-3" />{selectedListing.category}</span>
                <span className="bg-zinc-800 px-3 py-1 rounded-full text-zinc-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{selectedListing.location}</span>
                <span className="bg-zinc-800 px-3 py-1 rounded-full text-zinc-300">
                  {selectedListing.condition === 'new' ? 'Új' : 'Használt'}</span>
                <span className="bg-zinc-800 px-3 py-1 rounded-full text-zinc-300 flex items-center gap-1">
                  <Eye className="w-3 h-3" />{selectedListing.views_count} megtekintés</span>
              </div>
              <p className="text-zinc-300 whitespace-pre-wrap">{selectedListing.description}</p>
              {selectedListing.images?.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedListing.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="w-24 h-24 object-cover rounded shrink-0" />
                  ))}
                </div>
              )}
              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <button onClick={() => navigate(`/profile/${selectedListing.user_id}`)}
                  className="text-sm text-zinc-400 hover:text-white">Eladó: <span className="font-semibold text-white">{selectedListing.username}</span></button>
                {selectedListing.user_id !== user?.user_id && (
                  <Button onClick={() => { setSelectedListing(null); navigate('/messages'); }}
                    className="bg-primary hover:bg-orange-600">Üzenet küldése</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
