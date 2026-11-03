import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, SupportGoal, SocialLinks, AvatarCropState } from '../types';
import Avatar from '../components/Avatar';
import ImageCropModal from '../components/ImageCropModal';
import { ACCENT_PALETTE, BRAND_NAME } from '../lib/theme';
import { BRAND_DOMAIN } from '../lib/constants';
import {
  validateUsername,
  normalizeUsername,
  canChangeUsername,
} from '../lib/rules';
import { getCanonicalProfileUrl } from '../lib/urlUtils';
import { cleanFirestorePayload, getFriendlyErrorMessage } from '../lib/firestoreUtils';

import {
  Camera,
  Check,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Save,
  Globe,
  Instagram,
  Video,
  Twitter,
  Youtube,
  Music,
  ExternalLink,
  Target,
  Eye,
  Shield,
  HelpCircle,
  X,
} from 'lucide-react';
import { ThreadsIcon, normalizeThreadsUrl } from '../components/ThreadsIcon';

interface EditProfilePageProps {
  onNavigate: (route: string) => void;
}

export default function EditProfilePage({ onNavigate }: EditProfilePageProps) {
  const { user, profile, loading, setProfileData } = useAuth();

  // Form Fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [originalPhotoURL, setOriginalPhotoURL] = useState<string | null>(null);
  const [avatarCropState, setAvatarCropState] = useState<AvatarCropState | null>(null);
  const [accentColor, setAccentColor] = useState('#7C3AED');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [showTotalTips, setShowTotalTips] = useState(true);
  const [showSupporters, setShowSupporters] = useState(true);

  // Goal
  const [hasGoal, setHasGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('100');
  const [goalDesc, setGoalDesc] = useState('');

  // Username Change
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    error?: string;
    suggestions?: string[];
  }>({ checking: false });
  const [changingUsername, setChangingUsername] = useState(false);
  const [usernameNotice, setUsernameNotice] = useState('');

  // Image Crop Modal
  const [cropModalOpen, setCropModalOpen] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate form from user profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setSupportMessage(profile.supportMessage || '');
      const existingPhoto = profile.photoURL || profile.avatarUrl || null;
      setPhotoURL(existingPhoto);
      setOriginalPhotoURL(profile.originalPhotoURL || existingPhoto);
      setAvatarCropState(profile.avatarCropState || null);
      setAccentColor(profile.accentColor || '#7C3AED');
      setSocialLinks(profile.socialLinks || {});
      setShowTotalTips(profile.showTotalTips ?? true);
      setShowSupporters(profile.showSupporters ?? true);

      if (profile.activeGoal) {
        setHasGoal(true);
        setGoalTitle(profile.activeGoal.title);
        setGoalTarget(String(profile.activeGoal.targetAmountDollars));
        setGoalDesc(profile.activeGoal.description || '');
      } else {
        setHasGoal(false);
      }
    }
  }, [profile]);

  // Debounced username availability check
  useEffect(() => {
    const raw = newUsernameInput.trim();
    if (!raw) {
      setUsernameStatus({ checking: false });
      return;
    }

    const normalized = normalizeUsername(raw);
    const validation = validateUsername(normalized);
    if (!validation.valid) {
      setUsernameStatus({
        checking: false,
        available: false,
        error: validation.error,
      });
      return;
    }

    if (profile && normalized === profile.username) {
      setUsernameStatus({
        checking: false,
        available: true,
        error: 'This is your current username',
      });
      return;
    }

    setUsernameStatus({ checking: true });
    const timer = setTimeout(() => {
      fetch(`/api/username/check?username=${encodeURIComponent(normalized)}&userId=${user?.uid || ''}`)
        .then((res) => res.json())
        .then((data) => {
          setUsernameStatus({
            checking: false,
            available: data.available,
            error: data.error,
            suggestions: data.suggestions,
          });
        })
        .catch(() => {
          setUsernameStatus({
            checking: false,
            available: false,
            error: 'Could not verify username right now.',
          });
        });
    }, 350);

    return () => clearTimeout(timer);
  }, [newUsernameInput, profile, user]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-[#08051B] flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#7928FF] border-t-transparent animate-spin" />
      </div>
    );
  }

  const cooldown = canChangeUsername(profile.updatedAt || profile.createdAt);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSaveSuccess(false);

    try {
      const activeGoal: SupportGoal | null = hasGoal && goalTitle.trim()
        ? {
            id: profile.activeGoal?.id || 'goal_' + Date.now(),
            title: goalTitle.trim(),
            targetAmountDollars: Math.max(5, Number(goalTarget) || 100),
            currentAmountDollars: profile.activeGoal?.currentAmountDollars || 0,
            description: goalDesc.trim() || undefined,
            isActive: true,
            createdAt: profile.activeGoal?.createdAt || Date.now(),
          }
        : null;

      const updatedFields = {
        displayName: displayName.trim() || profile.username,
        bio: bio.trim(),
        supportMessage: supportMessage.trim(),
        photoURL: photoURL || undefined,
        avatarUrl: photoURL || undefined,
        accentColor,
        socialLinks: {
          ...socialLinks,
          threads: socialLinks.threads ? normalizeThreadsUrl(socialLinks.threads) : undefined,
        },
        showTotalTips,
        showSupporters,
        activeGoal,
        updatedAt: Date.now(),
      };

      const payload = cleanFirestorePayload(updatedFields);
      await updateDoc(doc(db, 'users', user.uid), payload);

      // Update local state
      setProfileData({
        ...profile,
        ...updatedFields,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setErrorMessage(getFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }

  };

  const handleConfirmUsernameChange = async () => {
    if (!newUsernameInput.trim() || !usernameStatus.available || changingUsername) return;
    setChangingUsername(true);
    setUsernameNotice('');

    try {
      const token = user.getIdToken ? await user.getIdToken() : '';
      const res = await fetch('/api/username/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: user.uid,
          newUsername: newUsernameInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change username');
      }

      // Update profile
      setProfileData({
        ...profile,
        username: data.username,
      });

      setUsernameNotice(data.message);
      setShowUsernameModal(false);
      setNewUsernameInput('');
    } catch (err: any) {
      setUsernameNotice(err.message || 'Failed to change username.');
    } finally {
      setChangingUsername(false);
    }
  };

  const publicUrl = getCanonicalProfileUrl(profile.username);

  return (
    <div className="min-h-screen bg-[#08051B] text-white pb-24 font-sans selection:bg-[#7928FF] selection:text-white">
      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#7928FF]/20 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-2.5 rounded-xl bg-[#1B103B]/70 border border-[#7928FF]/30 text-white/70 hover:text-white hover:bg-[#7928FF]/20 transition cursor-pointer"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-headline font-bold text-white tracking-tight">Edit Your TipZeMe</h1>
              <p className="text-xs text-white/60 mt-0.5">
                Customize your avatar, bio, visual colors, and public tipping jar.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate(`jar:${profile.username}`)}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B103B]/80 hover:bg-[#7928FF]/20 text-xs font-bold text-white transition border border-[#7928FF]/30 cursor-pointer shadow-xs"
          >
            <span>View Public Page</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#D49BFF]" />
          </button>
        </div>

        {usernameNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-[#7928FF]/15 border border-[#7928FF]/40 text-xs text-[#D49BFF] font-bold flex items-center justify-between">
            <span>{usernameNotice}</span>
            <button onClick={() => setUsernameNotice('')} className="text-white/60 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-[#7928FF]/20 border border-[#7928FF]/50 text-xs text-[#D49BFF] font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-[#D49BFF]" />
            <span>Profile updated successfully! All changes are live.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Profile Picture Card */}
              <div className="p-6 rounded-3xl surface-royal shadow-xl">
                <h3 className="text-sm font-headline font-bold text-white mb-4 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#D49BFF]" />
                  <span>Profile Photo</span>
                </h3>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative group cursor-pointer" onClick={() => setCropModalOpen(true)}>
                    <Avatar
                      url={photoURL}
                      name={displayName || profile.username}
                      size="2xl"
                      accentColor={accentColor}
                    />
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                      Change Photo
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <p className="text-xs text-white/60 font-medium leading-relaxed">
                      Your photo is the heart of your tipping page. It creates an instant, personal connection with your supporters.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() => setCropModalOpen(true)}
                        className="btn-luxury-primary px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{photoURL ? 'Change / Crop Photo' : 'Upload Photo'}</span>
                      </button>
                      {photoURL && (
                        <button
                          type="button"
                          onClick={() => setPhotoURL(null)}
                          className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 text-xs font-semibold transition cursor-pointer border border-red-500/30"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity & Bio */}
              <div className="p-6 rounded-3xl surface-royal shadow-xl space-y-4">
                <h3 className="text-sm font-headline font-bold text-white mb-2">Display Name & Bio</h3>

                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name or stage name"
                    className="w-full px-4 py-3 rounded-2xl bg-[#08051B]/70 border border-[#7928FF]/30 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7928FF] focus:ring-1 focus:ring-[#7928FF]/50 transition"
                  />
                </div>

                {/* Personal Tipping Link / Username Claim Section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-white/70">
                      Personal TipZeMe Link
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowUsernameModal(true)}
                      className="text-xs font-bold text-[#D49BFF] hover:underline cursor-pointer"
                    >
                      Change Username
                    </button>
                  </div>
                  <div className="flex items-center px-4 py-3 rounded-2xl bg-[#08051B]/60 border border-[#7928FF]/30 text-[#D49BFF] font-mono text-xs overflow-hidden">
                    <span className="truncate">{publicUrl}</span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">
                    Your personal tipping link. Changing your handle preserves your old QR codes with automatic redirection.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">
                    Biography
                  </label>
                  <textarea
                    rows={3}
                    maxLength={200}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell supporters what you create, perform, or do..."
                    className="w-full px-4 py-3 rounded-2xl bg-[#08051B]/70 border border-[#7928FF]/30 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7928FF] focus:ring-1 focus:ring-[#7928FF]/50 transition resize-none"
                  />
                  <div className="text-right text-[11px] text-white/40 font-mono">
                    {bio.length}/200
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5">
                    Tipping Prompt Message
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Good vibes deserve good tips! Leave a little love."
                    className="w-full px-4 py-3 rounded-2xl bg-[#08051B]/70 border border-[#7928FF]/30 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7928FF] focus:ring-1 focus:ring-[#7928FF]/50 transition"
                  />
                </div>
              </div>

              {/* Personal Accent Color */}
              <div className="p-6 rounded-3xl surface-royal shadow-xl">
                <h3 className="text-sm font-headline font-bold text-white mb-2">Brand Accent Color</h3>
                <p className="text-xs text-white/60 mb-4">
                  Select the vibrant color palette for your profile buttons and avatar ring.
                </p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {ACCENT_PALETTE.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setAccentColor(color.hex)}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                        accentColor.toLowerCase() === color.hex.toLowerCase()
                          ? 'border-[#7928FF] bg-[#7928FF]/20 shadow-md scale-105 ring-1 ring-[#D49BFF]/60'
                          : 'border-[#7928FF]/20 bg-[#120A2B]/60 hover:bg-[#7928FF]/10'
                      }`}
                    >
                      <span
                        className="w-7 h-7 rounded-full shadow-inner border border-white/20"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-[10px] font-bold text-white truncate w-full">
                        {color.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Social Media Links */}
              <div className="p-6 rounded-3xl surface-royal shadow-xl space-y-3">
                <h3 className="text-sm font-headline font-bold text-white mb-2">Social Links</h3>
                <p className="text-xs text-white/60 mb-3">
                  Display badges on your tipping page so supporters can follow your work.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Primary Social Column: Instagram, Threads, TikTok, X */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#08051B]/70 border border-[#7928FF]/30">
                      <Instagram className="w-4 h-4 text-pink-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Instagram username"
                        value={socialLinks.instagram || ''}
                        onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                        className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#08051B]/70 border border-[#7928FF]/30">
                      <ThreadsIcon className="w-4 h-4 text-purple-300 shrink-0" />
                      <input
                        type="text"
                        placeholder="Threads username or profile URL"
                        value={socialLinks.threads || ''}
                        onChange={(e) => setSocialLinks({ ...socialLinks, threads: e.target.value })}
                        className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#08051B]/70 border border-[#7928FF]/30">
                      <Video className="w-4 h-4 text-white shrink-0" />
                      <input
                        type="text"
                        placeholder="TikTok handle"
                        value={socialLinks.tiktok || ''}
                        onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })}
                        className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#08051B]/70 border border-[#7928FF]/30">
                      <Twitter className="w-4 h-4 text-sky-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="X / Twitter handle"
                        value={socialLinks.twitter || ''}
                        onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                        className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Secondary Social Column: YouTube, Spotify, Website */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#08051B]/70 border border-[#7928FF]/30">
                      <Youtube className="w-4 h-4 text-red-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="YouTube channel URL"
                        value={socialLinks.youtube || ''}
                        onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                        className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#08051B]/70 border border-[#7928FF]/30">
                      <Music className="w-4 h-4 text-[#D49BFF] shrink-0" />
                      <input
                        type="text"
                        placeholder="Spotify / Apple Music link"
                        value={socialLinks.spotify || ''}
                        onChange={(e) => setSocialLinks({ ...socialLinks, spotify: e.target.value })}
                        className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#08051B]/70 border border-[#7928FF]/30">
                      <Globe className="w-4 h-4 text-[#D49BFF] shrink-0" />
                      <input
                        type="text"
                        placeholder="Website URL"
                        value={socialLinks.website || ''}
                        onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                        className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>


              {/* Support Goal */}
              <div className="p-6 rounded-3xl surface-royal shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#D49BFF]" />
                    <h3 className="text-sm font-headline font-bold text-white">Support Goal</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasGoal}
                      onChange={(e) => setHasGoal(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#1B103B] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7928FF]"></div>
                  </label>
                </div>

                {hasGoal && (
                  <div className="space-y-3 pt-2 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-white/70 mb-1">
                          Goal Title
                        </label>
                        <input
                          type="text"
                          required={hasGoal}
                          placeholder="e.g. New studio microphone"
                          value={goalTitle}
                          onChange={(e) => setGoalTitle(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#08051B]/70 border border-[#7928FF]/30 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7928FF]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-white/70 mb-1">
                          Target ($USD)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="10000"
                          required={hasGoal}
                          placeholder="100"
                          value={goalTarget}
                          onChange={(e) => setGoalTarget(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#08051B]/70 border border-[#7928FF]/30 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7928FF]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-white/70 mb-1">
                        Optional Details
                      </label>
                      <input
                        type="text"
                        placeholder="Why you're raising funds..."
                        value={goalDesc}
                        onChange={(e) => setGoalDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#08051B]/70 border border-[#7928FF]/30 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7928FF]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy Toggles */}
              <div className="p-6 rounded-3xl surface-royal shadow-xl space-y-4">
                <h3 className="text-sm font-headline font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#D49BFF]" />
                  <span>Privacy & Public Visibility</span>
                </h3>

                <div className="flex items-center justify-between py-2 border-b border-[#7928FF]/20">
                  <div>
                    <p className="text-xs font-bold text-white">Show Total Tips Received</p>
                    <p className="text-[11px] text-white/50">
                      Display your cumulative earnings on your public tipping profile.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showTotalTips}
                    onChange={(e) => setShowTotalTips(e.target.checked)}
                    className="w-4 h-4 accent-[#7928FF] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-xs font-bold text-white">Show Recent Supporters</p>
                    <p className="text-[11px] text-white/50">
                      Allow your public page to show kind messages and names left by supporters.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showSupporters}
                    onChange={(e) => setShowSupporters(e.target.checked)}
                    className="w-4 h-4 accent-[#7928FF] cursor-pointer"
                  />
                </div>
              </div>

              {/* Save Bar */}
              <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-[#08051B]/95 backdrop-blur-md border border-[#7928FF]/30 shadow-2xl flex items-center justify-between">
                <span className="text-xs text-white/60 font-medium hidden sm:inline">
                  Make sure to save your profile changes.
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-luxury-primary w-full sm:w-auto px-8 py-3 rounded-xl text-white font-bold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Column (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 space-y-3">
              <div className="flex items-center justify-between px-2 text-xs text-white/60 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#D49BFF]" /> Live Public Preview
                </span>
                <span className="text-[10px] font-mono text-[#D49BFF]">{BRAND_DOMAIN}/{profile.username}</span>
              </div>

              {/* Mock Phone Frame */}
              <div className="p-5 rounded-3xl surface-royal-elevated shadow-2xl text-center space-y-4 relative overflow-hidden border border-[#7928FF]/30">
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7928FF] via-[#A855F7] to-[#D49BFF]"
                />

                <div className="flex flex-col items-center pt-2">
                  <Avatar
                    url={photoURL}
                    name={displayName || profile.username}
                    size="xl"
                    accentColor={accentColor}
                    className="mb-3"
                  />
                  <h4 className="text-lg font-headline font-bold text-white tracking-tight">{displayName || profile.username}</h4>
                  <p className="text-xs font-mono text-[#D49BFF] font-bold mt-0.5">@{profile.username}</p>
                </div>

                <p className="text-xs text-white/70 italic px-2">
                  “{bio || 'Your bio will appear here to welcome supporters.'}”
                </p>

                {/* Social Badges Preview */}
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {Object.entries(socialLinks).map(([k, v]) =>
                    v ? (
                      <span
                        key={k}
                        className="px-2.5 py-0.5 rounded-full bg-[#1B103B] border border-[#7928FF]/30 text-[10px] font-medium text-[#D49BFF]"
                      >
                        {k}
                      </span>
                    ) : null
                  )}
                </div>

                {/* Support prompt */}
                <div className="p-3 rounded-2xl bg-[#08051B]/80 border border-[#7928FF]/25 text-xs text-white font-medium">
                  {supportMessage || 'Good vibes deserve good tips! Leave a little love.'}
                </div>

                {/* Preset tip preview */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[3, 5, 10, 25].map((amt) => (
                    <div
                      key={amt}
                      className="py-2 rounded-xl bg-[#1B103B]/80 border border-[#7928FF]/30 text-xs font-bold text-white text-center tabular-nums"
                    >
                      ${amt}
                    </div>
                  ))}
                </div>

                {/* Main Tip Button Preview */}
                <div
                  className="btn-luxury-primary w-full py-3 rounded-2xl text-white font-bold text-xs shadow-md text-center"
                >
                  Tip ${5}.00
                </div>

                <div className="text-[10px] text-white/40 font-mono pt-2">
                  Powered by TipZeMe • Good vibes deserve good tips
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Photo Crop & Zoom Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        currentPhotoUrl={photoURL}
        onSave={(data: any) => {
          const validUrl = typeof data === 'string' ? data : data?.croppedUrl || null;
          setPhotoURL(validUrl);
        }}
      />

      {/* Username Change Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08051B]/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#120A2B] border border-[#7928FF]/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-left">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-headline font-bold text-white tracking-tight">Change Personal Tipping URL</h3>
              <button
                onClick={() => setShowUsernameModal(false)}
                className="text-white/60 hover:text-white p-1 rounded-xl hover:bg-[#7928FF]/20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-white/60">
              Claim a new username for your tipping link.
            </p>

            {/* Cooldown Warning */}
            {!cooldown.allowed && (
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-300">
                <p className="font-bold">Username Change Cooldown Active</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  To protect your links and supporters, usernames can only be changed once every 30 days. You can change it again in <strong>{cooldown.daysRemaining} days</strong> (on {cooldown.nextAllowedDate}).
                </p>
              </div>
            )}

            {cooldown.allowed && (
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-xl bg-[#08051B]/80 border border-[#7928FF]/30 text-[11px] text-white/70 space-y-1">
                  <p className="font-bold text-[#D49BFF]">Automatic Link Protection:</p>
                  <p>• Your previous URL <code className="text-white font-mono">{BRAND_DOMAIN}/{profile.username}</code> will automatically redirect to your new username.</p>
                  <p>• Existing printed QR codes will continue working.</p>
                  <p>• Your Stripe payouts and earnings are untouched.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1">
                    New Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 font-mono text-xs">@</span>
                    <input
                      type="text"
                      maxLength={24}
                      value={newUsernameInput}
                      onChange={(e) => setNewUsernameInput(e.target.value.toLowerCase())}
                      placeholder="new_handle"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#08051B] border border-[#7928FF]/30 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[#7928FF]"
                    />
                  </div>

                  {/* Real-time status */}
                  {usernameStatus.checking && (
                    <p className="text-[11px] text-white/60 mt-1.5 flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full border border-[#7928FF] border-t-transparent animate-spin inline-block" />
                      Checking availability...
                    </p>
                  )}

                  {!usernameStatus.checking && usernameStatus.available && (
                    <p className="text-[11px] text-[#D49BFF] font-bold mt-1.5 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {BRAND_DOMAIN}/{normalizeUsername(newUsernameInput)} is available!
                    </p>
                  )}

                  {!usernameStatus.checking && usernameStatus.error && (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-[11px] text-red-400 font-bold">
                        {usernameStatus.error}
                      </p>
                      {usernameStatus.suggestions && usernameStatus.suggestions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="text-[10px] text-white/60">Suggestions:</span>
                          {usernameStatus.suggestions.slice(0, 3).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setNewUsernameInput(s)}
                              className="text-[10px] bg-[#1B103B] hover:bg-[#7928FF]/30 text-[#D49BFF] px-2 py-0.5 rounded font-mono border border-[#7928FF]/40 cursor-pointer"
                            >
                              @{s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUsernameModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              {cooldown.allowed && (
                <button
                  type="button"
                  onClick={handleConfirmUsernameChange}
                  disabled={!usernameStatus.available || changingUsername}
                  className="btn-luxury-primary px-5 py-2 rounded-xl text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {changingUsername ? 'Updating...' : 'Claim New Handle'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
