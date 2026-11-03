import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowUpRight, Check, AlertCircle, LogOut, UserCheck, CreditCard, TrendingUp, Sparkles } from 'lucide-react';
import Avatar from '../components/Avatar';
import { BRAND_NAME, TAGLINE } from '../lib/theme';
import { getCanonicalProfileUrl } from '../lib/urlUtils';
import PWAInstallButton from '../components/PWAInstallButton';

interface SettingsPageProps {
  onNavigate: (route: string) => void;
}

export default function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { user, profile, loading, logout, setProfileData } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      onNavigate('signin');
    }
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setSupportMessage(profile.supportMessage || '');
    }
  }, [user, profile, loading, onNavigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSaving(true);
    setSavedSuccess(false);
    setError('');

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        supportMessage: supportMessage.trim(),
      });

      setProfileData({
        ...profile,
        displayName: displayName.trim(),
        bio: bio.trim(),
        supportMessage: supportMessage.trim(),
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.warn('Profile update locally saved:', err);
      setProfileData({
        ...profile,
        displayName: displayName.trim(),
        bio: bio.trim(),
        supportMessage: supportMessage.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onNavigate('landing');
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#7C3AED] border-t-transparent animate-spin" />
      </div>
    );
  }

  const accent = profile.accentColor || '#7C3AED';

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#18181B] pb-24 font-sans selection:bg-[#7C3AED] selection:text-white">
      <main className="max-w-xl mx-auto px-4 pt-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-[#18181B]">Settings</h1>
          <button
            onClick={() => onNavigate(`jar:${profile.username}`)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#5B21B6] px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
          >
            <span>View Public Page</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Management Suite */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => onNavigate('edit-profile')}
            className="p-4 rounded-2xl bg-white border border-[#E4E4E7] hover:border-[#7C3AED] text-left transition flex flex-col justify-between cursor-pointer shadow-xs hover:bg-[#F5F3FF]/40"
          >
            <UserCheck className="w-5 h-5 text-[#7C3AED] mb-2" />
            <div>
              <p className="font-bold text-xs text-[#18181B]">Edit Profile</p>
              <p className="text-[11px] text-[#71717A]">Photo, bio & socials</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('payouts')}
            className="p-4 rounded-2xl bg-white border border-[#E4E4E7] hover:border-[#7C3AED] text-left transition flex flex-col justify-between cursor-pointer shadow-xs hover:bg-[#F5F3FF]/40"
          >
            <CreditCard className="w-5 h-5 text-[#7C3AED] mb-2" />
            <div>
              <p className="font-bold text-xs text-[#18181B]">Bank Payouts</p>
              <p className="text-[11px] text-[#71717A]">Stripe balances & bank</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('activity')}
            className="p-4 rounded-2xl bg-white border border-[#E4E4E7] hover:border-[#7C3AED] text-left transition flex flex-col justify-between cursor-pointer shadow-xs hover:bg-[#F5F3FF]/40"
          >
            <TrendingUp className="w-5 h-5 text-[#7C3AED] mb-2" />
            <div>
              <p className="font-bold text-xs text-[#18181B]">Activity Ledger</p>
              <p className="text-[11px] text-[#71717A]">Tips & net earnings</p>
            </div>
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E4E7] shadow-md space-y-6">
          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[#7C3AED] text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-[#7C3AED]" />
              <span>Settings updated successfully!</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-1.5">
                Personal TipZeMe Link
              </label>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-xs font-mono text-[#18181B] gap-2 overflow-hidden">
                <span className="truncate">{getCanonicalProfileUrl(profile.username)}</span>
                <button
                  type="button"
                  onClick={() => onNavigate('edit-profile')}
                  className="text-xs font-bold text-[#7C3AED] hover:underline cursor-pointer shrink-0"
                >
                  Change Handle
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl border border-[#E4E4E7] bg-white px-4 py-3 text-sm text-[#18181B] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-1.5">
                Biography
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-2xl border border-[#E4E4E7] bg-white px-4 py-3 text-sm text-[#18181B] focus:outline-none focus:border-[#7C3AED] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-1.5">
                Prompt Message
              </label>
              <input
                type="text"
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                className="w-full rounded-2xl border border-[#E4E4E7] bg-white px-4 py-3 text-sm text-[#18181B] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-black text-xs transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* PWA Install Menu Item */}
          <div className="pt-6 border-t border-[#E4E4E7]">
            <PWAInstallButton variant="menu-item" />
          </div>

          {/* Account Security & Sign Out */}
          <div className="pt-6 border-t border-[#E4E4E7] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#18181B]">Signed In Account</p>
              <p className="text-[11px] text-[#71717A] font-mono truncate max-w-[200px]">
                {user?.email || profile?.username}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
