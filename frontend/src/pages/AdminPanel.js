import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Users, FileText, Calendar, DollarSign, Check, X, Trash2, Shield, Mail, MailCheck, Image, Send, Ticket, Gift, Plus, Minus, ShoppingBag, Car } from 'lucide-react';

export const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  
  // Kör email state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Kupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponAmount, setCouponAmount] = useState('');
  const [couponMaxUses, setCouponMaxUses] = useState('1');
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // Egyenleg kezelés state
  const [adjustAmounts, setAdjustAmounts] = useState({});
  const [adjustingUser, setAdjustingUser] = useState(null);

  useEffect(() => {
    if (user?.role !== 1) {
      window.location.href = '/feed';
      return;
    }
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    // Külön kezeljük az API hívásokat, hogy ha egy hibázik, a többi még működjön
    try {
      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }

    try {
      const eventsRes = await api.get('/events');
      setEvents(eventsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]);
    }

    try {
      const paymentsRes = await api.get('/admin/payments');
      setPayments(paymentsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      setPayments([]);
    }

    try {
      const postsRes = await api.get('/posts/pending');
      setPendingPosts(postsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch pending posts:', error);
      setPendingPosts([]);
    }

    try {
      const couponsRes = await api.get('/admin/coupons');
      setCoupons(couponsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      setCoupons([]);
    }

    try {
      const listingsRes = await api.get('/admin/marketplace/listings');
      setAllListings(listingsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      setAllListings([]);
    }

    try {
      const clubsRes = await api.get('/admin/clubs');
      setAllClubs(clubsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch clubs:', error);
      setAllClubs([]);
    }
  };

  // Kör email küldése
  const handleSendMassEmail = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast.error('Add meg a tárgyat és a tartalmat!');
      return;
    }
    
    if (!window.confirm(`Biztosan kiküldesz egy kör emailt minden felhasználónak?\n\nTárgy: ${emailSubject}`)) {
      return;
    }
    
    setSendingEmail(true);
    try {
      const res = await api.post('/admin/mass-email', {
        subject: emailSubject,
        content: emailContent
      });
      toast.success(res.data.message);
      setEmailSubject('');
      setEmailContent('');
    } catch (error) {
      toast.error('Hiba történt az email küldésekor');
    } finally {
      setSendingEmail(false);
    }
  };

  // Kupon létrehozása
  const handleCreateCoupon = async () => {
    if (!couponCode.trim() || !couponAmount) {
      toast.error('Add meg a kuponkódot és az összeget!');
      return;
    }
    
    setCreatingCoupon(true);
    try {
      await api.post('/admin/coupons', {
        code: couponCode,
        amount: parseFloat(couponAmount),
        max_uses: parseInt(couponMaxUses) || 1
      });
      toast.success('Kupon létrehozva!');
      setCouponCode('');
      setCouponAmount('');
      setCouponMaxUses('1');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hiba történt');
    } finally {
      setCreatingCoupon(false);
    }
  };

  // Kupon törlése
  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Biztosan törlöd ezt a kupont?')) return;
    try {
      await api.delete(`/admin/coupons/${couponId}`);
      toast.success('Kupon törölve');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleApprovePost = async (postId) => {
    try {
      await api.post(`/posts/${postId}/approve`);
      toast.success('Poszt jóváhagyva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleRejectPost = async (postId) => {
    if (!window.confirm('Biztosan elutasítod és törlöd ezt a posztot?')) return;
    try {
      await api.post(`/posts/${postId}/reject`);
      toast.success('Poszt elutasítva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Biztosan törlöd ezt a felhasználót?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('Felhasználó törölve');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}/role?role=${role}`);
      toast.success('Role frissítve');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleVerifyEmail = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/verify-email`);
      toast.success('Email megerősítve');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleAdjustBalance = async (userId, isAdd) => {
    const amount = parseFloat(adjustAmounts[userId]);
    if (!amount || amount <= 0) {
      toast.error('Adj meg egy érvényes összeget!');
      return;
    }

    const adjustAmount = isAdd ? amount : -amount;
    setAdjustingUser(userId);
    try {
      await api.put(`/admin/wallet/${userId}/adjust?amount=${adjustAmount}`);
      toast.success(`Egyenleg ${isAdd ? 'hozzáadva' : 'levonva'}: ${amount} Ft`);
      setAdjustAmounts(prev => ({ ...prev, [userId]: '' }));
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    } finally {
      setAdjustingUser(null);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Biztosan törlöd ezt az eseményt?')) return;
    try {
      await api.delete(`/admin/events/${eventId}`);
      toast.success('Esemény törölve');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleApproveEvent = async (eventId) => {
    try {
      await api.put(`/admin/events/${eventId}/approve`);
      toast.success('Esemény jóváhagyva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleRejectEvent = async (eventId) => {
    try {
      await api.put(`/admin/events/${eventId}/reject`);
      toast.success('Esemény elutasítva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleApproveHighlight = async (eventId) => {
    try {
      await api.put(`/admin/events/${eventId}/highlight-approve`);
      toast.success('Kiemelés jóváhagyva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleRejectHighlight = async (eventId) => {
    try {
      await api.put(`/admin/events/${eventId}/highlight-reject`);
      toast.success('Kiemelés elutasítva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      await api.put(`/admin/payments/${paymentId}/approve`);
      toast.success('Fizetés jóváhagyva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleRejectPayment = async (paymentId) => {
    try {
      await api.put(`/admin/payments/${paymentId}/reject`);
      toast.success('Fizetés elutasítva');
      fetchAllData();
    } catch (error) {
      toast.error('Hiba történt');
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Biztosan törlöd ezt a hirdetést?')) return;
    try {
      await api.delete(`/admin/marketplace/listings/${listingId}`);
      toast.success('Hirdetés törölve');
      fetchAllData();
    } catch (error) { toast.error('Hiba történt'); }
  };

  const handleApproveClub = async (clubId) => {
    try {
      await api.put(`/admin/clubs/${clubId}/approve`);
      toast.success('Klub jóváhagyva');
      fetchAllData();
    } catch (error) { toast.error('Hiba történt'); }
  };

  const handleRejectClub = async (clubId) => {
    try {
      await api.put(`/admin/clubs/${clubId}/reject`);
      toast.success('Klub elutasítva');
      fetchAllData();
    } catch (error) { toast.error('Hiba történt'); }
  };

  const handleDeleteClub = async (clubId) => {
    if (!window.confirm('Biztosan törlöd ezt a klubot?')) return;
    try {
      await api.delete(`/admin/clubs/${clubId}`);
      toast.success('Klub törölve');
      fetchAllData();
    } catch (error) { toast.error('Hiba történt'); }
  };

  if (user?.role !== 1) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-10 h-10 text-primary" />
          <h1 className="font-chakra text-4xl font-bold uppercase text-white" data-testid="admin-heading">
            Admin Panel
          </h1>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-zinc-900 border border-white/10 p-1 flex-wrap">
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Felhasználók ({users.length})
            </TabsTrigger>
            <TabsTrigger value="posts" className="data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-posts">
              <Image className="w-4 h-4 mr-2" />
              Posztok ({pendingPosts.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-events">
              <Calendar className="w-4 h-4 mr-2" />
              Események ({events.filter(e => e.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-payments">
              <DollarSign className="w-4 h-4 mr-2" />
              Fizetések ({payments.filter(p => p.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="email" className="data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-email">
              <Send className="w-4 h-4 mr-2" />
              Kör Email
            </TabsTrigger>
            <TabsTrigger value="coupons" className="data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-coupons">
              <Gift className="w-4 h-4 mr-2" />
              Kuponok
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-marketplace">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Piactér ({allListings.length})
            </TabsTrigger>
            <TabsTrigger value="clubs" className="data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-clubs">
              <Car className="w-4 h-4 mr-2" />
              Klubok ({allClubs.filter(c => c.status === 'pending').length})
            </TabsTrigger>
          </TabsList>

          {/* Kör Email tab */}
          <TabsContent value="email" className="space-y-4 mt-6">
            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Kör Email Küldése
                </h2>
                <p className="text-sm text-zinc-400">Email küldése minden megerősített email című felhasználónak</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email tárgya</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="pl. Új esemény a hétvégén!"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <Label>Email tartalma</Label>
                  <Textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Írd meg az üzeneted..."
                    className="bg-zinc-800 border-zinc-700 min-h-[200px]"
                  />
                </div>
                <Button
                  onClick={handleSendMassEmail}
                  disabled={sendingEmail}
                  className="bg-primary hover:bg-orange-600"
                >
                  {sendingEmail ? (
                    <>Küldés folyamatban...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Email kiküldése mindenkinek
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Kuponok tab */}
          <TabsContent value="coupons" className="space-y-4 mt-6">
            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  Kupon Létrehozása
                </h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Kuponkód</Label>
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="pl. NYAR2024"
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div>
                    <Label>Összeg (Ft)</Label>
                    <Input
                      type="number"
                      value={couponAmount}
                      onChange={(e) => setCouponAmount(e.target.value)}
                      placeholder="pl. 500"
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div>
                    <Label>Max felhasználás</Label>
                    <Input
                      type="number"
                      value={couponMaxUses}
                      onChange={(e) => setCouponMaxUses(e.target.value)}
                      placeholder="1"
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleCreateCoupon}
                      disabled={creatingCoupon}
                      className="bg-primary hover:bg-orange-600 w-full"
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Létrehozás
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white">
                  Aktív Kuponok
                </h2>
              </CardHeader>
              <CardContent>
                {coupons.length === 0 ? (
                  <p className="text-zinc-400">Nincs aktív kupon</p>
                ) : (
                  <div className="space-y-3">
                    {coupons.map((coupon) => (
                      <div key={coupon.coupon_id} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                        <div>
                          <p className="font-bold text-primary text-lg">{coupon.code}</p>
                          <p className="text-sm text-zinc-400">
                            +{coupon.amount} Ft • Felhasználva: {coupon.used_count}/{coupon.max_uses}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCoupon(coupon.coupon_id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Posztok moderáció */}
          <TabsContent value="posts" className="space-y-4 mt-6">
            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white">
                  Posztok jóváhagyása
                </h2>
              </CardHeader>
              <CardContent>
                {pendingPosts.length === 0 ? (
                  <p className="text-zinc-400">Nincs jóváhagyásra váró poszt</p>
                ) : (
                  <div className="space-y-4">
                    {pendingPosts.map((post) => (
                      <div key={post.post_id} className="p-4 bg-zinc-800/30 rounded-lg">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white">{post.username}</p>
                            <p className="text-sm text-zinc-400 mt-1 break-words">{post.content}</p>
                            
                            {post.image_base64 && (
                              <img
                                src={post.image_base64}
                                alt="Post"
                                className="mt-3 max-h-48 rounded-lg object-cover"
                              />
                            )}
                            
                            {post.video_base64 && (
                              <video
                                src={post.video_base64}
                                controls
                                className="mt-3 max-h-48 rounded-lg"
                              />
                            )}
                          </div>
                          
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleApprovePost(post.post_id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectPost(post.post_id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-6">
            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white">
                  Felhasználók kezelése
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((u) => (
                    <div
                      key={u.user_id}
                      className="p-4 bg-zinc-800/30 rounded-lg space-y-3"
                      data-testid="user-item"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-semibold">{u.username}</p>
                            {u.email_verified ? (
                              <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                                <MailCheck className="w-3 h-3" />
                                Megerősítve
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                                <Mail className="w-3 h-3" />
                                Nincs megerősítve
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-zinc-500">{u.email}</p>
                          <p className="text-sm text-primary font-semibold mt-1">Egyenleg: {u.wallet_balance || 0} Ft</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!u.email_verified && (
                            <Button
                              onClick={() => handleVerifyEmail(u.user_id)}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              data-testid="verify-email-button"
                            >
                              <MailCheck className="w-4 h-4 mr-1" />
                              Megerősít
                            </Button>
                          )}
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.user_id, parseInt(e.target.value))}
                            className="bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-1 text-sm"
                            data-testid="user-role-select"
                          >
                            <option value={0}>User</option>
                            <option value={1}>Admin</option>
                          </select>
                          <Button
                            onClick={() => handleDeleteUser(u.user_id)}
                            size="sm"
                            variant="destructive"
                            data-testid="delete-user-button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Egyenleg kezelés */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <DollarSign className="w-4 h-4 text-zinc-500 shrink-0" />
                        <Input
                          data-testid={`adjust-amount-${u.user_id}`}
                          type="number"
                          min="1"
                          value={adjustAmounts[u.user_id] || ''}
                          onChange={(e) => setAdjustAmounts(prev => ({ ...prev, [u.user_id]: e.target.value }))}
                          placeholder="Összeg (Ft)"
                          className="bg-zinc-900 border-zinc-700 h-8 text-sm w-32"
                        />
                        <Button
                          data-testid={`add-balance-${u.user_id}`}
                          onClick={() => handleAdjustBalance(u.user_id, true)}
                          disabled={adjustingUser === u.user_id || !adjustAmounts[u.user_id]}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 h-8 px-3"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Hozzáad
                        </Button>
                        <Button
                          data-testid={`subtract-balance-${u.user_id}`}
                          onClick={() => handleAdjustBalance(u.user_id, false)}
                          disabled={adjustingUser === u.user_id || !adjustAmounts[u.user_id]}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 h-8 px-3"
                        >
                          <Minus className="w-3 h-3 mr-1" />
                          Elvesz
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4 mt-6">
            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white">
                  Események jóváhagyása
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.filter(e => e.status === 'pending').map((event) => (
                    <div
                      key={event.event_id}
                      className="p-4 bg-zinc-800/30 rounded-lg space-y-3"
                      data-testid="event-approval-item"
                    >
                      <div>
                        <p className="text-white font-bold">{event.title}</p>
                        <p className="text-sm text-zinc-400 mt-1">{event.description}</p>
                        <p className="text-xs text-zinc-500 mt-1">Szerző: {event.username}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApproveEvent(event.event_id)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                          data-testid="approve-event-button"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Jóváhagy
                        </Button>
                        <Button
                          onClick={() => handleRejectEvent(event.event_id)}
                          size="sm"
                          variant="destructive"
                          data-testid="reject-event-button"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Elutasít
                        </Button>
                        <Button
                          onClick={() => handleDeleteEvent(event.event_id)}
                          size="sm"
                          variant="destructive"
                          data-testid="delete-event-button"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Törlés
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* All Events Section */}
                  <div className="mt-8">
                    <h3 className="font-chakra text-lg font-bold uppercase text-white mb-4">
                      Összes esemény
                    </h3>
                    {events.map((event) => (
                      <div
                        key={event.event_id}
                        className="p-4 bg-zinc-800/30 rounded-lg space-y-3 mb-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-white font-bold">{event.title}</p>
                            <p className="text-sm text-zinc-400 mt-1">{event.description}</p>
                            <p className="text-xs text-zinc-500 mt-1">Szerző: {event.username}</p>
                            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              event.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                              event.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                              'bg-yellow-500/20 text-yellow-500'
                            }`}>
                              {event.status === 'approved' ? 'Jóváhagyva' : event.status === 'rejected' ? 'Elutasítva' : 'Függőben'}
                            </span>
                          </div>
                          <Button
                            onClick={() => handleDeleteEvent(event.event_id)}
                            size="sm"
                            variant="destructive"
                            data-testid="delete-all-event-button"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {events.filter(e => e.highlighted_pending).length > 0 && (
                    <div className="mt-8">
                      <h3 className="font-chakra text-lg font-bold uppercase text-white mb-4">
                        Kiemelési kérelmek
                      </h3>
                      {events.filter(e => e.highlighted_pending).map((event) => (
                        <div
                          key={event.event_id}
                          className="p-4 bg-zinc-800/30 rounded-lg space-y-3 mb-3"
                        >
                          <div>
                            <p className="text-white font-bold">{event.title}</p>
                            <p className="text-xs text-zinc-500 mt-1">Szerző: {event.username}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApproveHighlight(event.event_id)}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Kiemelés jóváhagyása
                            </Button>
                            <Button
                              onClick={() => handleRejectHighlight(event.event_id)}
                              size="sm"
                              variant="destructive"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Kiemelés elutasítása
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4 mt-6">
            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white">
                  Fizetések jóváhagyása
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.filter(p => p.status === 'pending').map((payment) => (
                    <div
                      key={payment.payment_id}
                      className="p-4 bg-zinc-800/30 rounded-lg space-y-3"
                      data-testid="payment-approval-item"
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="text-white font-bold">{payment.amount} Ft</p>
                          <p className="text-sm text-zinc-400 mt-1">Felhasználó: {payment.username}</p>
                          <p className="text-xs text-zinc-500 mt-1">Közlemény: {payment.unique_reference}</p>
                        </div>
                        <div>
                          <span className="px-3 py-1 bg-zinc-700 text-zinc-300 rounded text-xs uppercase tracking-wider">
                            {payment.payment_method}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprovePayment(payment.payment_id)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                          data-testid="approve-payment-button"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Jóváhagy
                        </Button>
                        <Button
                          onClick={() => handleRejectPayment(payment.payment_id)}
                          size="sm"
                          variant="destructive"
                          data-testid="reject-payment-button"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Elutasít
                        </Button>
                      </div>
                    </div>
                  ))}
                  {payments.filter(p => p.status === 'pending').length === 0 && (
                    <p className="text-zinc-500 text-center py-8">Nincsenek függőben lévő fizetések</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Piactér tab */}
          <TabsContent value="marketplace" className="space-y-4 mt-6">
            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  Összes Hirdetés
                </h2>
              </CardHeader>
              <CardContent>
                {allListings.length === 0 ? (
                  <p className="text-zinc-400">Nincs hirdetés</p>
                ) : (
                  <div className="space-y-3">
                    {allListings.map(listing => (
                      <div key={listing.listing_id} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          {listing.images?.[0] ? (
                            <img src={listing.images[0]} alt="" className="w-12 h-12 object-cover rounded shrink-0" />
                          ) : (
                            <div className="w-12 h-12 bg-zinc-700 rounded flex items-center justify-center shrink-0">
                              <ShoppingBag className="w-5 h-5 text-zinc-500" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-semibold truncate">{listing.title}</p>
                            <p className="text-sm text-primary font-bold">{listing.price?.toLocaleString()} Ft</p>
                            <p className="text-xs text-zinc-500">{listing.username} - {listing.category}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteListing(listing.listing_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Klubok tab */}
          <TabsContent value="clubs" className="space-y-4 mt-6">
            {allClubs.filter(c => c.status === 'pending').length > 0 && (
              <Card className="bg-zinc-900/50 border-white/5">
                <CardHeader>
                  <h2 className="font-chakra text-xl font-bold uppercase text-white">
                    Jóváhagyásra váró klubok
                  </h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allClubs.filter(c => c.status === 'pending').map(club => (
                      <div key={club.club_id} className="p-4 bg-zinc-800/30 rounded-lg space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center text-primary font-bold">
                            {club.logo_image ? <img src={club.logo_image} alt="" className="w-full h-full object-cover rounded-lg" /> : club.name?.[0]}
                          </div>
                          <div>
                            <p className="text-white font-bold">{club.name}</p>
                            <p className="text-sm text-zinc-400">{club.description?.substring(0, 100)}</p>
                            <p className="text-xs text-zinc-500">Alapító: {club.owner_username} - {club.is_public ? 'Nyilvános' : 'Privát'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApproveClub(club.club_id)} className="bg-green-600 hover:bg-green-700">
                            <Check className="w-4 h-4 mr-1" />Jóváhagy
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectClub(club.club_id)}>
                            <X className="w-4 h-4 mr-1" />Elutasít
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <h2 className="font-chakra text-xl font-bold uppercase text-white">Összes Klub</h2>
              </CardHeader>
              <CardContent>
                {allClubs.length === 0 ? (
                  <p className="text-zinc-400">Nincs klub</p>
                ) : (
                  <div className="space-y-3">
                    {allClubs.map(club => (
                      <div key={club.club_id} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center text-primary font-bold shrink-0">
                            {club.logo_image ? <img src={club.logo_image} alt="" className="w-full h-full object-cover rounded-lg" /> : club.name?.[0]}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{club.name}</p>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-zinc-500">{club.members_count} tag</span>
                              <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                                club.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                                club.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                'bg-yellow-500/20 text-yellow-500'
                              }`}>{club.status === 'approved' ? 'Aktív' : club.status === 'rejected' ? 'Elutasítva' : 'Függőben'}</span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteClub(club.club_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
