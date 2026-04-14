import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import api from '../utils/api';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Email elküldve! Nézd meg a postafiókod.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hiba történt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div
        className="hidden md:block auth-bg"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1771931108145-f961735d24dc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHx1bmRlcmdyb3VuZCUyMHBhcmtpbmclMjBsb3QlMjBkYXJrJTIwbW9vZHxlbnwwfHx8fDE3NzI1NTE1Mzl8MA&ixlib=rb-4.1.0&q=85)',
        }}
      />
      
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_motorist-net/artifacts/2gvxxjuk_download.jpg" 
              alt="Logo" 
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h2 className="font-chakra text-2xl font-bold uppercase tracking-tight text-white">
                Tuning<span className="text-primary">Találkozók</span>
              </h2>
            </div>
          </div>

          <div>
            <h1 className="font-chakra text-3xl font-bold uppercase tracking-tight text-white mb-2" data-testid="forgot-password-heading">
              Elfelejtett jelszó
            </h1>
            <p className="text-base text-zinc-400">
              Add meg az email címed és küldünk egy visszaállító linket.
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
                <p className="font-medium">Email elküldve!</p>
                <p className="text-sm mt-2">Nézd meg a postafiókod és kattints a linkre a jelszó visszaállításához.</p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Vissza a bejelentkezéshez
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="forgot-password-form">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-zinc-400 uppercase tracking-wider">
                  Email cím
                </Label>
                <Input
                  id="email"
                  data-testid="email-input"
                  type="email"
                  placeholder="pelda@email.hu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-zinc-950 border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-sm text-white placeholder:text-zinc-600"
                />
              </div>

              <Button
                data-testid="submit-button"
                type="submit"
                className="w-full font-chakra font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-orange-600 shadow-orange-glow hover:shadow-orange-glow-lg transition-all duration-200"
                disabled={loading}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                {loading ? 'Küldés...' : 'Visszaállító link küldése'}
              </Button>
            </form>
          )}

          <div className="text-center">
            <Link to="/login" className="text-sm text-zinc-500 hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Vissza a bejelentkezéshez
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Érvénytelen vagy hiányzó token');
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('A jelszavak nem egyeznek');
      return;
    }
    
    if (password.length < 6) {
      toast.error('A jelszónak legalább 6 karakter hosszúnak kell lennie');
      return;
    }
    
    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      toast.success('Jelszó sikeresen megváltoztatva!');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Hiba történt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div
        className="hidden md:block auth-bg"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1771931108145-f961735d24dc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwxfHx1bmRlcmdyb3VuZCUyMHBhcmtpbmclMjBsb3QlMjBkYXJrJTIwbW9vZHxlbnwwfHx8fDE3NzI1NTE1Mzl8MA&ixlib=rb-4.1.0&q=85)',
        }}
      />
      
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_motorist-net/artifacts/2gvxxjuk_download.jpg" 
              alt="Logo" 
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h2 className="font-chakra text-2xl font-bold uppercase tracking-tight text-white">
                Tuning<span className="text-primary">Találkozók</span>
              </h2>
            </div>
          </div>

          <div>
            <h1 className="font-chakra text-3xl font-bold uppercase tracking-tight text-white mb-2" data-testid="reset-password-heading">
              Új jelszó beállítása
            </h1>
            <p className="text-base text-zinc-400">
              Adj meg egy új jelszót a fiókodhoz.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="reset-password-form">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-zinc-400 uppercase tracking-wider">
                Új jelszó
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  data-testid="password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-zinc-950 border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-sm text-white placeholder:text-zinc-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm text-zinc-400 uppercase tracking-wider">
                Jelszó megerősítése
              </Label>
              <Input
                id="confirmPassword"
                data-testid="confirm-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="bg-zinc-950 border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-sm text-white placeholder:text-zinc-600"
              />
            </div>

            <Button
              data-testid="submit-button"
              type="submit"
              className="w-full font-chakra font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-orange-600 shadow-orange-glow hover:shadow-orange-glow-lg transition-all duration-200"
              disabled={loading}
            >
              {loading ? 'Mentés...' : 'Jelszó mentése'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
