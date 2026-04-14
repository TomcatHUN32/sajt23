import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { UserSearch } from './UserSearch';
import { FriendRequests } from './FriendRequests';
import {
  Home,
  Calendar,
  Wallet as WalletIcon,
  Users,
  LogOut,
  Shield,
  Menu,
  X,
  MessageCircle,
  ShoppingBag,
  Car
} from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="flex items-center justify-between">
            <Link to="/feed" className="flex items-center gap-2">
              <img
                src="https://customer-assets.emergentagent.com/job_motorist-net/artifacts/2gvxxjuk_download.jpg"
                alt="TuningTalálkozók"
                className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover"
              />

              <span className="font-chakra text-lg md:text-xl font-bold uppercase tracking-tight hidden sm:inline">
                <span className="text-white">TUNING</span>
                <span className="text-primary">TALÁLKOZÓK</span>
              </span>
            </Link>

            {/* DESKTOP NAV */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/feed"
                className={`flex items-center gap-2 transition-colors ${
                  isActive('/feed') ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
                data-testid="nav-feed"
              >
                <Home className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Hírfolyam
                </span>
              </Link>

              <Link
                to="/events"
                className={`flex items-center gap-2 transition-colors ${
                  isActive('/events') ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
                data-testid="nav-events"
              >
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Események
                </span>
              </Link>

              <Link
                to="/messages"
                className={`flex items-center gap-2 transition-colors ${
                  isActive('/messages') ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Chat
                </span>
              </Link>

              <Link
                to="/marketplace"
                className={`flex items-center gap-2 transition-colors ${
                  isActive('/marketplace') ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
                data-testid="nav-marketplace"
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Piactér
                </span>
              </Link>

              <Link
                to="/clubs"
                className={`flex items-center gap-2 transition-colors ${
                  isActive('/clubs') ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
                data-testid="nav-clubs"
              >
                <Car className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Klubok
                </span>
              </Link>

              <Link
                to="/wallet"
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors"
                data-testid="nav-wallet"
              >
                <WalletIcon className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-primary">
                  {user?.wallet_balance || 0} Ft
                </span>
              </Link>
            </nav>

            {/* DESKTOP USER MENU */}
            <div className="hidden md:flex items-center gap-3">
              <UserSearch />
              <FriendRequests />

              {user?.role === 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Avatar>
                    <AvatarImage src={user?.profile_pic} />
                    <AvatarFallback className="bg-zinc-800 text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-lg py-2">
                    <Link
                      to={`/profile/${user?.user_id}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                      onClick={() => setShowMenu(false)}
                    >
                      <Users className="w-4 h-4" />
                      Profilom
                    </Link>

                    <Link
                      to="/messages"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                      onClick={() => setShowMenu(false)}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat
                    </Link>

                    <button
                      onClick={() => {
                        logout();
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Kijelentkezés
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* MOBILE RIGHT SIDE */}
            <div className="flex md:hidden items-center gap-2">
              <UserSearch />
              <FriendRequests />

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="text-white"
              >
                {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* MOBILE MENU */}
          {showMobileMenu && (
            <div className="md:hidden mt-4 pb-4 space-y-2 border-t border-white/10 pt-4">
              <Link
                to="/feed"
                className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <Home className="w-5 h-5" />
                <span className="font-semibold">Hírfolyam</span>
              </Link>

              <Link
                to="/events"
                className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <Calendar className="w-5 h-5" />
                <span className="font-semibold">Események</span>
              </Link>

              <Link
                to="/messages"
                className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="font-semibold">Chat</span>
              </Link>

              <Link
                to="/marketplace"
                className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="font-semibold">Piactér</span>
              </Link>

              <Link
                to="/clubs"
                className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <Car className="w-5 h-5" />
                <span className="font-semibold">Klubok</span>
              </Link>

              <Link
                to="/wallet"
                className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <WalletIcon className="w-5 h-5" />
                <span className="font-semibold">
                  Tárca ({user?.wallet_balance || 0} Ft)
                </span>
              </Link>

              <Link
                to={`/profile/${user?.user_id}`}
                className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <Users className="w-5 h-5" />
                <span className="font-semibold">Profilom</span>
              </Link>

              {user?.role === 1 && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">Admin Panel</span>
                </Link>
              )}

              <button
                onClick={() => {
                  logout();
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-3 p-3 text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-semibold">Kijelentkezés</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 border-t border-white/10 backdrop-blur-md">
        <div className="grid grid-cols-5 h-16">
          <Link
            to="/feed"
            className={`flex flex-col items-center justify-center text-xs transition-colors ${
              isActive('/feed') ? 'text-primary' : 'text-zinc-400'
            }`}
          >
            <Home className="w-5 h-5 mb-1" />
            Feed
          </Link>

          <Link
            to="/marketplace"
            className={`flex flex-col items-center justify-center text-xs transition-colors ${
              isActive('/marketplace') ? 'text-primary' : 'text-zinc-400'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-1" />
            Piactér
          </Link>

          <Link
            to="/clubs"
            className={`flex flex-col items-center justify-center text-xs transition-colors ${
              isActive('/clubs') ? 'text-primary' : 'text-zinc-400'
            }`}
          >
            <Car className="w-5 h-5 mb-1" />
            Klubok
          </Link>

          <Link
            to="/events"
            className={`flex flex-col items-center justify-center text-xs transition-colors ${
              isActive('/events') ? 'text-primary' : 'text-zinc-400'
            }`}
          >
            <Calendar className="w-5 h-5 mb-1" />
            Események
          </Link>

          <Link
            to="/messages"
            className={`flex flex-col items-center justify-center text-xs transition-colors ${
              isActive('/messages') ? 'text-primary' : 'text-zinc-400'
            }`}
          >
            <MessageCircle className="w-5 h-5 mb-1" />
            Chat
          </Link>
        </div>
      </div>

      {/* MOBILE NAV SPACER */}
      <div className="h-16 md:hidden" />
    </>
  );
};