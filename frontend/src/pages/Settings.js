import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Settings as SettingsIcon, ArrowLeft } from 'lucide-react';

export const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setEmailLoading(true);

    try {
      await api.post('/auth/request-email-change', {
        new_email: newEmail,
        password: emailPassword
      });
      toast.success('Megerősítő email elküldve az új címre!');
      setNewEmail('');
      setEmailPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hiba történt');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Vissza
          </button>
          <h1 className="font-chakra text-3xl font-bold uppercase tracking-tight text-white flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Beállítások
          </h1>
          <p className="text-zinc-400 mt-2">Fiók és biztonsági beállítások kezelése</p>
        </div>

        <div className="space-y-6">
          <Card className="border border-white/5 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Mail className="w-5 h-5 text-primary" />
                Email cím módosítása
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400 mb-4">
                Jelenlegi email: <span className="text-white">{user?.email}</span>
              </p>
              
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail" className="text-sm text-zinc-400 uppercase tracking-wider">
                    Új email cím
                  </Label>
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder="uj@email.hu"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="bg-zinc-950 border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-sm text-white placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailPassword" className="text-sm text-zinc-400 uppercase tracking-wider">
                    Jelenlegi jelszó
                  </Label>
                  <div className="relative">
                    <Input
                      id="emailPassword"
                      type={showEmailPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      required
                      className="bg-zinc-950 border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-sm text-white placeholder:text-zinc-600 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailPassword(!showEmailPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showEmailPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={emailLoading}
                  className="bg-primary text-primary-foreground hover:bg-orange-600"
                >
                  {emailLoading ? 'Küldés...' : 'Email módosítása'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-white/5 bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Lock className="w-5 h-5 text-primary" />
                Jelszó módosítása
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400 mb-4">
                A jelszó módosításához használd az elfelejtett jelszó funkciót.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  navigate('/forgot-password');
                }}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Jelszó visszaállítása
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
