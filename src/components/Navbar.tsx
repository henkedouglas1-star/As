import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, LayoutDashboard, Settings, UserCheck, ExternalLink, LogOut, ChevronDown, TrendingUp } from 'lucide-react';
import Avatar from './Avatar';
import BrandLogo from './BrandLogo';

interface NavbarProps {
  onNavigate: (route: string) => void;
  currentRoute: string;
}

export default function Navbar({ onNavigate, currentRoute }: NavbarProps) {
  const { user, profile, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full sticky top-0 z-40 bg-[#0A0912]/80 backdrop-blur-xl border-b border-white/[0.08] text-white shadow-xs transition-all duration-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand with Approved 3D Crystal T Monogram */}
        <button
          onClick={() => onNavigate(user ? 'dashboard' : 'landing')}
          className="flex items-center gap-3 hover:opacity-95 transition group text-left cursor-pointer"
          aria-label="TipZeMe Home"
        >
          <BrandLogo size="md" />
        </button>

        {/* Navigation Items */}
        <div className="flex items-center gap-2 sm:gap-3">
          {loading ? (
            <div className="h-9 w-24 bg-white/[0.05] rounded-xl animate-pulse" />
          ) : user ? (
            profile ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                    currentRoute === 'dashboard'
                      ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-violet-400" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => onNavigate('activity')}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                    currentRoute === 'activity'
                      ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                  <span>Activity</span>
                </button>

                <button
                  onClick={() => onNavigate(`jar:${profile.username}`)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-950/40 hover:bg-violet-900/50 text-xs font-semibold text-violet-300 transition border border-violet-500/25 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-violet-300" />
                  <span>My Public Page</span>
                </button>

                <button
                  onClick={() => onNavigate('edit-profile')}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    currentRoute === 'edit-profile'
                      ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>

                {/* User Dropdown / Avatar Menu */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition cursor-pointer"
                    aria-label="User Account Menu"
                  >
                    <Avatar
                      url={profile.photoURL || profile.avatarUrl}
                      name={profile.displayName || profile.username}
                      size="sm"
                      accentColor={profile.accentColor || '#7C3AED'}
                      ring={false}
                    />
                    <span className="hidden md:inline font-semibold text-xs text-white">
                      @{profile.username}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {menuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-[#13111E] border border-white/[0.1] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-white backdrop-blur-2xl"
                      onClick={() => setMenuOpen(false)}
                    >
                      <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
                        <p className="text-xs font-bold text-white truncate">{profile.displayName}</p>
                        <p className="text-[11px] text-violet-400 font-mono truncate">@{profile.username}</p>
                      </div>

                      <button
                        onClick={() => onNavigate('dashboard')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-xl transition text-left cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-violet-400" />
                        <span>Dashboard</span>
                      </button>

                      <button
                        onClick={() => onNavigate('activity')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-xl transition text-left cursor-pointer"
                      >
                        <TrendingUp className="w-4 h-4 text-violet-400" />
                        <span>Activity Ledger</span>
                      </button>

                      <button
                        onClick={() => onNavigate(`jar:${profile.username}`)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-xl transition text-left cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4 text-violet-400" />
                        <span>View My Tipping Page</span>
                      </button>

                      <button
                        onClick={() => onNavigate('edit-profile')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-xl transition text-left cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4 text-violet-400" />
                        <span>Edit Profile & Photo</span>
                      </button>

                      <button
                        onClick={() => onNavigate('payouts')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-xl transition text-left cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4 text-amber-300" />
                        <span>Bank Payouts</span>
                      </button>

                      <button
                        onClick={() => onNavigate('affiliate')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-200 hover:text-white hover:bg-white/[0.05] rounded-xl transition text-left cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Partner Program</span>
                      </button>

                      <button
                        onClick={() => onNavigate('settings')}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-xl transition text-left cursor-pointer"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>

                      <div className="border-t border-white/[0.08] my-1" />

                      <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('onboarding')}
                className="luxe-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white flex items-center cursor-pointer"
              >
                <span>Create Your Tip Link</span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => onNavigate('signin')}
                className="px-3.5 sm:px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('onboarding')}
                className="luxe-button-primary rounded-xl px-4 sm:px-5 py-2 text-xs font-semibold text-white flex items-center cursor-pointer shadow-sm"
              >
                <span className="hidden sm:inline">Create Your Tip Link</span>
                <span className="sm:hidden">Create Link</span>
              </button>
            </div>

          )}
        </div>
      </div>
    </nav>
  );
}
