import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { validateUsername, normalizeUsername } from '../lib/rules';
import { ACCENT_PALETTE, BRAND_NAME } from '../lib/theme';
import { BRAND_DOMAIN } from '../lib/constants';
import { cleanFirestorePayload } from '../lib/firestoreUtils';
import Avatar from '../components/Avatar';
import ImageCropModal from '../components/ImageCropModal';
import {
  Sparkles,
  ArrowRight,
  Check,
  AlertCircle,
  Camera,
  Coffee,
  Heart,
  DollarSign,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';


interface OnboardingPageProps {
  onNavigate: (route: string) => void;
  referralCode?: string;
}

export default function OnboardingPage({ onNavigate, referralCode }: OnboardingPageProps) {
  const { user, profile, loading, signInWithGoogle, setProfileData } = useAuth();

  const [step, setStep] = useState<number>(1);

  // Form Fields
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState('#7C3AED');

  // Username validation state
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Crop Modal
  const [cropModalOpen, setCropModalOpen] = useState(false);

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // If user already has a profile, redirect to dashboard
  useEffect(() => {
    if (!loading && user && profile) {
      onNavigate('dashboard');
    }
  }, [user, profile, loading, onNavigate]);

  // If logged in via Firebase Auth, prefill displayName
  useEffect(() => {
    if (user && !displayName) {
      if (user.displayName) {
        setDisplayName(user.displayName);
        if (!username) {
          const suggested = normalizeUsername(user.displayName.replace(/\s+/g, '_')).slice(0, 20);
          setUsername(suggested);
        }
      }
      if (user.photoURL && !photoURL) {
        setPhotoURL(user.photoURL);
      }
    }
  }, [user]);

  // Debounced real-time availability check
  useEffect(() => {
    const raw = username.trim();
    if (!raw) {
      setUsernameAvailable(null);
      setUsernameError('');
      setSuggestions([]);
      return;
    }

    const normalized = normalizeUsername(raw);
    const validation = validateUsername(normalized);
    if (!validation.valid) {
      setUsernameAvailable(false);
      setUsernameError(validation.error || 'Invalid username');
      setSuggestions([]);
      return;
    }

    setCheckingUsername(true);
    setUsernameError('');

    const timer = setTimeout(() => {
      fetch(`/api/username/check?username=${encodeURIComponent(normalized)}`)
        .then((res) => res.json())
        .then((data) => {
          setCheckingUsername(false);
          setUsernameAvailable(data.available);
          setUsernameError(data.error || '');
          setSuggestions(data.suggestions || []);
        })
        .catch(() => {
          setCheckingUsername(false);
          setUsernameAvailable(false);
          setUsernameError('Could not verify username right now.');
        });
    }, 350);

    return () => clearTimeout(timer);
  }, [username]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !usernameAvailable || checkingUsername) return;

    setSubmitting(true);
    setGeneralError('');

    try {
      let activeUserId = user?.uid;
      let activeEmail = user?.email || `${username}@tipzeme.internal`;

      // If no user is logged in, use Google sign-in
      if (!activeUserId) {
        try {
          const cred = await signInWithGoogle();
          activeUserId = cred.user.uid;
          activeEmail = cred.user.email || activeEmail;
        } catch (authErr: any) {
          const code = authErr?.code || '';
          if (code === 'auth/popup-closed-by-user') {
            setGeneralError('Google sign-in popup was closed before completing. Click to try again.');
            setSubmitting(false);
            return;
          }
          if (code === 'auth/popup-blocked') {
            setGeneralError('Google sign-in popup was blocked by your browser. Please allow popups or open in a browser window.');
            setSubmitting(false);
            return;
          }
          setGeneralError(authErr?.message || 'Please sign in with Google to create your profile.');
          setSubmitting(false);
          return;
        }
      }

      const normalized = normalizeUsername(username);

      // Reserve username in index
      await setDoc(doc(db, 'usernames', normalized), {
        uid: activeUserId,
        username: normalized,
        createdAt: Date.now(),
      });

      // Save user profile
      const newProfile: UserProfile = {
        uid: activeUserId,
        email: activeEmail,
        username: normalized,
        displayName: displayName.trim() || normalized,
        bio: bio.trim(),
        photoURL: photoURL || undefined,
        avatarUrl: photoURL || undefined,
        accentColor,
        referredBy: referralCode || undefined,
        chargesEnabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        showTotalTips: true,
        showSupporters: true,
      };

      await setDoc(doc(db, 'users', activeUserId), cleanFirestorePayload(newProfile));

      setProfileData(newProfile);
      onNavigate('dashboard');

    } catch (err: any) {
      console.error('Error creating profile:', err);
      setGeneralError(err.message || 'Failed to complete profile creation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08051B] text-white flex items-center justify-center p-4 py-12 font-sans selection:bg-[#7928FF] selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-[#7928FF]/20 via-[#A855F7]/15 to-transparent rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-xl surface-royal-elevated rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden z-10">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-[#7928FF] via-[#A855F7] to-[#D49BFF]" />

        {/* Brand Kicker */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7928FF] to-[#A855F7] flex items-center justify-center text-white font-black text-sm shadow-md border border-white/20">
            <Heart className="w-4 h-4 fill-white" />
          </div>
          <span className="font-headline font-black text-lg tracking-tight text-white">
            Tip<span className="text-[#D49BFF]">ZeMe</span>
          </span>
          <span className="text-xs text-[#968AAE] font-medium ml-auto">
            Step {step} of 3
          </span>
        </div>

        {/* Visual Progress Stepper */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { num: 1, label: 'Claim Handle' },
            { num: 2, label: 'Photo & Bio' },
            { num: 3, label: 'Launch' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-2 p-2 rounded-xl transition ${
                step >= s.num
                  ? 'bg-[#7928FF]/20 border border-[#7928FF]/40 text-white'
                  : 'bg-white/[0.03] text-white/40 border border-white/[0.06]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  step > s.num
                    ? 'bg-[#D49BFF] text-[#08051B]'
                    : step === s.num
                    ? 'bg-[#7928FF] text-white'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {step > s.num ? <Check className="w-3 h-3 stroke-[3]" /> : s.num}
              </div>
              <span className="text-xs font-semibold truncate">{s.label}</span>
            </div>
          ))}
        </div>


        {generalError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/70 border border-rose-800 text-xs text-rose-200 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={step === 3 ? handleCreateProfile : (e) => { e.preventDefault(); setStep(step + 1); }}>
          {/* STEP 1: Claim Unique Personal URL */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="font-headline text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Claim your personal tipping link
                </h2>
                <p className="text-xs sm:text-sm text-[#C9BFDF] mt-1.5 leading-relaxed">
                  Choose your unique TipZeMe handle. This is the link you’ll share on social media, streams, tables, and bios.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#968AAE] mb-2 uppercase tracking-wider">
                  Choose Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#968AAE] font-mono text-xs sm:text-sm">
                    {BRAND_DOMAIN}/
                  </span>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={24}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="yourname"
                    className="w-full pl-40 sm:pl-44 pr-10 py-3.5 rounded-2xl bg-[#08051B] border border-[#7928FF]/30 text-sm font-mono text-white focus:outline-none focus:border-[#D49BFF] transition"
                  />
                  {checkingUsername && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <span className="w-4 h-4 rounded-full border-2 border-[#7928FF] border-t-transparent animate-spin inline-block" />
                    </div>
                  )}
                  {!checkingUsername && usernameAvailable === true && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D49BFF]">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Real-time Status */}
                {usernameAvailable === true && (
                  <p className="text-xs text-[#D49BFF] font-bold mt-2 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {BRAND_DOMAIN}/{normalizeUsername(username)} is available!
                  </p>
                )}


                {usernameError && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-rose-400 font-bold">{usernameError}</p>
                    {suggestions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-[#968AAE]">Available alternatives:</span>
                        {suggestions.slice(0, 3).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setUsername(s)}
                            className="text-xs bg-[#120A2B] hover:bg-[#1B103B] text-[#D49BFF] px-2.5 py-1 rounded-xl font-mono cursor-pointer transition border border-[#7928FF]/30"
                          >
                            @{s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-[#968AAE] mt-2">
                  3–24 characters. Lowercase letters, numbers, and underscores. You can change this later in settings.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!usernameAvailable || checkingUsername}
                className="btn-luxury-primary w-full py-4 text-sm font-extrabold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue to Profile Photo</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>

              <div className="pt-4 border-t border-white/[0.08] text-center text-xs">
                <span className="text-[#968AAE]">Already have a TipZeMe account? </span>
                <button
                  type="button"
                  onClick={() => onNavigate('signin')}
                  className="text-[#D49BFF] hover:underline font-bold transition cursor-pointer"
                >
                  Sign In with Google
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Profile Picture & Bio */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="font-headline text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Add your photo &amp; info
                </h2>
                <p className="text-xs sm:text-sm text-[#C9BFDF] mt-1.5">
                  Supporters tip people, not faceless links. Add your photo to build immediate trust.
                </p>
              </div>

              {/* Photo Upload Circle */}
              <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-[#120A2B]/70 border border-[#7928FF]/25">
                <div
                  onClick={() => setCropModalOpen(true)}
                  className="relative group cursor-pointer mb-3"
                >
                  <Avatar
                    url={photoURL}
                    name={displayName || username}
                    size="3xl"
                    accentColor={accentColor}
                  />
                  <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-xs font-bold gap-1 backdrop-blur-xs">
                    <Camera className="w-6 h-6 text-[#D49BFF]" />
                    <span>Upload Photo</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCropModalOpen(true)}
                  className="btn-luxury-secondary px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 mr-1 text-[#D49BFF]" />
                  <span>{photoURL ? 'Change & Crop Photo' : 'Upload Profile Photo'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#968AAE] mb-1.5 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-4 py-3 rounded-2xl bg-[#08051B] border border-[#7928FF]/30 text-sm text-white focus:outline-none focus:border-[#D49BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#968AAE] mb-1.5 uppercase tracking-wider">
                  Short Bio
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Artist, musician, barista, creator..."
                  className="w-full px-4 py-3 rounded-2xl bg-[#08051B] border border-[#7928FF]/30 text-sm text-white focus:outline-none focus:border-[#D49BFF]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-luxury-secondary w-1/3 py-3.5 text-xs cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!displayName.trim()}
                  className="btn-luxury-primary w-2/3 py-3.5 text-xs font-black cursor-pointer disabled:opacity-50"
                >
                  Next: Choose Vibe
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Accent Color & Launch */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h2 className="font-headline text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Choose your personal vibe
                </h2>
                <p className="text-xs sm:text-sm text-[#C9BFDF] mt-1.5">
                  Pick the accent color for your tipping buttons and avatar frame.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {ACCENT_PALETTE.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setAccentColor(color.hex)}
                    className={`p-4 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                      accentColor.toLowerCase() === color.hex.toLowerCase()
                        ? 'border-[#D49BFF] bg-[#7928FF]/20 shadow-md scale-105'
                        : 'border-[#7928FF]/20 bg-[#120A2B]/60 hover:bg-[#1B103B]'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full shadow-inner border border-white/20"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs font-bold text-white">{color.name}</span>
                  </button>
                ))}
              </div>

              {/* Payout Readiness Explanation */}
              <div className="p-3.5 rounded-2xl bg-[#08051B]/80 border border-[#7928FF]/25 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-[#D49BFF] font-bold">
                  <ShieldCheck className="w-4 h-4 text-[#D49BFF]" />
                  <span>How Payouts Work</span>
                </div>
                <p className="text-[#C9BFDF] text-[11px] leading-relaxed">
                  Your personal tipping link is live immediately. You can connect your bank account via Stripe Connect in your dashboard whenever you're ready to receive payouts.
                </p>
              </div>

              {/* Review Snapshot Card */}
              <div className="p-4 rounded-2xl bg-[#120A2B]/80 border border-[#7928FF]/25 flex items-center gap-3">
                <Avatar
                  url={photoURL}
                  name={displayName || username}
                  size="md"
                  accentColor={accentColor}
                />
                <div className="flex-1 truncate">
                  <p className="text-xs font-bold text-white truncate">{displayName || username}</p>
                  <p className="text-[11px] font-mono text-[#D49BFF] truncate font-bold">{BRAND_DOMAIN}/{username}</p>
                </div>
              </div>


              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-luxury-secondary w-1/3 py-3.5 text-xs cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-luxury-primary w-2/3 py-3.5 text-sm font-black cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Authenticating & Launching...'
                      : user
                      ? 'Launch My TipZeMe'
                      : 'Sign In with Google & Launch'}
                  </span>
                </button>
              </div>
              {!user && (
                <p className="text-[11px] text-center text-[#968AAE] mt-2">
                  Opens in a separate secure Google window while keeping TipZeMe open.
                </p>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Image Crop & Zoom Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        currentPhotoUrl={photoURL}
        onSave={(dataUrl: any) => {
          const valid = typeof dataUrl === 'string' ? dataUrl : dataUrl?.croppedUrl || null;
          setPhotoURL(valid);
        }}
      />
    </div>
  );
}
