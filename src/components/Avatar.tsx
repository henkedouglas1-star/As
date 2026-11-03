import React, { useState, useEffect } from 'react';
import { getInitials } from '../lib/theme';

interface AvatarProps {
  url?: string | null | any;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  accentColor?: string;
  className?: string;
  ring?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base font-bold',
  xl: 'w-20 h-20 text-xl font-extrabold',
  '2xl': 'w-28 h-28 text-2xl font-black',
  '3xl': 'w-36 h-36 text-3xl font-black',
};

export default function Avatar({
  url,
  name = 'User',
  size = 'md',
  accentColor = '#7C3AED',
  className = '',
  ring = true,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Safely extract string URL even if an object or invalid type is passed
  const safeUrl: string | null = typeof url === 'string' && url.trim().length > 0
    ? url.trim()
    : url && typeof url === 'object' && typeof (url as any).croppedUrl === 'string'
      ? (url as any).croppedUrl
      : null;

  // Clear previous error whenever the photo url prop updates
  useEffect(() => {
    setImgError(false);
  }, [safeUrl]);

  const initials = getInitials(name);
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const hasValidPhoto = Boolean(safeUrl && !imgError);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 aspect-square rounded-full overflow-hidden select-none transition-transform duration-200 ${sizeClasses} ${className}`}
      style={
        ring
          ? {
              boxShadow: `0 0 0 2px #FFFFFF, 0 0 0 4px ${accentColor}`,
            }
          : undefined
      }
    >
      {hasValidPhoto ? (
        <img
          key={safeUrl}
          src={safeUrl!}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full aspect-square object-cover rounded-full block select-none pointer-events-none"
          loading="lazy"
        />
      ) : (
        <div
          className="w-full h-full aspect-square rounded-full flex items-center justify-center font-bold tracking-tight bg-[#F5F3FF] text-[#7C3AED] border border-[#EDE9FE] shadow-inner select-none"
        >
          {initials}
        </div>
      )}
    </div>
  );
}
