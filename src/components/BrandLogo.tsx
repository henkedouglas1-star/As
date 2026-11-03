import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

export default function BrandLogo({
  size = 'md',
  showText = true,
  className = '',
  textClassName = '',
}: BrandLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 3D Crystal Gem "T" Monogram */}
      <div className={`relative flex-shrink-0 ${iconSizes[size]} group-hover:scale-105 transition-transform duration-300`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(139,92,246,0.45)]"
        >
          <defs>
            {/* Top Bar Gradient */}
            <linearGradient id="t-top-bar" x1="4" y1="8" x2="44" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>

            {/* Top Bevel Highlight */}
            <linearGradient id="t-top-bevel" x1="8" y1="8" x2="40" y2="8" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#E9D5FF" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#C084FC" stopOpacity="0.2" />
            </linearGradient>

            {/* Stem Left Facet (Light) */}
            <linearGradient id="t-stem-left" x1="16" y1="18" x2="26" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="60%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#4C1D95" />
            </linearGradient>

            {/* Stem Right Facet (Darker / Dimensional Depth) */}
            <linearGradient id="t-stem-right" x1="24" y1="18" x2="32" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="50%" stopColor="#5B21B6" />
              <stop offset="100%" stopColor="#2E1065" />
            </linearGradient>

            {/* Inner Glow / Refraction */}
            <radialGradient id="t-inner-refraction" cx="24" cy="20" r="18" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5F3FF" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#C084FC" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Ambient Glow */}
          <circle cx="24" cy="24" r="20" fill="url(#t-inner-refraction)" />

          {/* Stem Left Facet */}
          <path
            d="M18.5 19H24.5V40.5C24.5 42 23.5 42.5 22 42L18.5 39.5V19Z"
            fill="url(#t-stem-left)"
          />

          {/* Stem Right Facet (creates the crystal ridge) */}
          <path
            d="M24.5 19H29.5V37C29.5 39 28.5 40.5 27 41.5L24.5 42V19Z"
            fill="url(#t-stem-right)"
          />

          {/* Top Crossbar - Main Sculpted Body */}
          <path
            d="M7 11C7 9.34315 8.34315 8 10 8H38C39.6569 8 41 9.34315 41 11V16C41 17.6569 39.6569 19 38 19H10C8.34315 19 7 17.6569 7 16V11Z"
            fill="url(#t-top-bar)"
          />

          {/* Left Wing Facet Chamfer */}
          <path
            d="M7 11C7 9.34315 8.34315 8 10 8H17L14 19H10C8.34315 19 7 17.6569 7 16V11Z"
            fill="#DDD6FE"
            fillOpacity="0.45"
          />

          {/* Right Wing Facet Shadow */}
          <path
            d="M34 8H38C39.6569 8 41 9.34315 41 11V16C41 17.6569 39.6569 19 38 19H31L34 8Z"
            fill="#4C1D95"
            fillOpacity="0.35"
          />

          {/* Top Glass Specular Reflection Highlight */}
          <path
            d="M10 9H38C39.1046 9 40 9.89543 40 11V12C40 10.8954 39.1046 10 38 10H10C8.89543 10 8 10.8954 8 12V11C8 9.89543 8.89543 9 10 9Z"
            fill="url(#t-top-bevel)"
          />

          {/* Front Center Crystal Ridge Reflection */}
          <path
            d="M24.5 19L24.5 41"
            stroke="#FFFFFF"
            strokeOpacity="0.6"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <span
          className={`font-display font-bold tracking-tight text-white flex items-baseline ${textSizes[size]} ${textClassName}`}
        >
          Tip<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-purple-400 font-extrabold">ZeMe</span>
          <span className="text-[10px] ml-0.5 text-violet-400/80 font-normal">™</span>
        </span>
      )}
    </div>
  );
}
