import React from 'react';
import { LayoutDashboard, Sparkles, TrendingUp, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export default function BottomNav({ currentRoute, onNavigate }: BottomNavProps) {
  const { user, profile } = useAuth();

  if (!user || !profile) return null;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutDashboard,
      action: () => onNavigate('dashboard'),
      active: currentRoute === 'dashboard',
    },
    {
      id: 'my-jar',
      label: 'My Page',
      icon: Sparkles,
      action: () => {
        if (profile?.username) {
          onNavigate(`jar:${profile.username}`);
        } else {
          onNavigate('onboarding');
        }
      },
      active: Boolean(profile?.username && currentRoute === `jar:${profile.username}`),
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: TrendingUp,
      action: () => onNavigate('activity'),
      active: currentRoute === 'activity',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      action: () => onNavigate('settings'),
      active: currentRoute === 'settings',
    },
  ];

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0912]/95 backdrop-blur-xl border-t border-white/[0.08] px-3 pt-2 safe-pb shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
                item.active
                  ? 'text-violet-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </div>
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
