import React from 'react';

export default function HeroArtwork() {
  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[400px] mx-auto select-none pointer-events-none">
      {/* Background Volumetric Violet Lighting & Caustics */}
      <div
        className="absolute -top-12 left-1/2 -translate-x-1/2 w-[380px] h-[340px] bg-gradient-to-tr from-violet-600/35 via-fuchsia-500/25 to-purple-800/10 rounded-full blur-[90px] -z-10"
        aria-hidden="true"
      />

      {/* 3D Liquid Luxe Crystal Tile & Sculpted "T" Monogram */}
      <div className="relative flex flex-col items-center">
        <svg
          viewBox="0 0 380 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto drop-shadow-[0_30px_60px_rgba(124,58,237,0.45)] transition-transform duration-700 hover:scale-[1.02]"
          role="img"
          aria-label="Liquid Luxe 3D crystal glass brand block featuring the TipZeMe emblem"
        >
          <defs>
            {/* Glass Block Body Gradient */}
            <linearGradient id="glassBlockBody" x1="60" y1="30" x2="320" y2="250" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2E1065" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#1E1035" stopOpacity="0.75" />
              <stop offset="70%" stopColor="#120824" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0A0414" stopOpacity="0.98" />
            </linearGradient>

            {/* Glass Rim Light / Prismatic Stroke */}
            <linearGradient id="glassRimGlow" x1="50" y1="20" x2="330" y2="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="20%" stopColor="#C084FC" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#7C3AED" stopOpacity="0.4" />
              <stop offset="80%" stopColor="#C084FC" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
            </linearGradient>

            {/* Specular Diagonal Glass Glare */}
            <linearGradient id="glassGlare" x1="80" y1="30" x2="220" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#DDD6FE" stopOpacity="0.15" />
              <stop offset="70%" stopColor="#A855F7" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
            </linearGradient>

            {/* 3D "T" Sculpted Face Gradient */}
            <linearGradient id="tFaceGrad" x1="110" y1="65" x2="270" y2="195" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E9D5FF" />
              <stop offset="25%" stopColor="#C084FC" />
              <stop offset="65%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>

            {/* 3D "T" Shadow / Depth Extrusion Gradient */}
            <linearGradient id="tDepthGrad" x1="160" y1="85" x2="210" y2="210" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#581C87" />
              <stop offset="60%" stopColor="#3B0764" />
              <stop offset="100%" stopColor="#1B0630" />
            </linearGradient>

            {/* Specular Edge Line */}
            <linearGradient id="tSpecularEdge" x1="115" y1="68" x2="265" y2="68" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#F5F3FF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#C084FC" stopOpacity="0.3" />
            </linearGradient>

            {/* Floor Caustic Reflection */}
            <radialGradient id="floorReflectionGlow" cx="190" cy="275" r="140" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C084FC" stopOpacity="0.6" />
              <stop offset="35%" stopColor="#7C3AED" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#4C1D95" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0B0616" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. Floor Reflection Caustic Pool */}
          <ellipse cx="190" cy="282" rx="145" ry="32" fill="url(#floorReflectionGlow)" />

          {/* 2. Glass Block Outer Shadow */}
          <rect
            x="68"
            y="38"
            width="244"
            height="214"
            rx="52"
            fill="#05020A"
            fillOpacity="0.7"
            filter="blur(16px)"
          />

          {/* 3. Outer Crystal Glass Rounded Block */}
          <rect
            x="65"
            y="30"
            width="250"
            height="220"
            rx="54"
            fill="url(#glassBlockBody)"
            stroke="url(#glassRimGlow)"
            strokeWidth="3.5"
          />

          {/* 4. Glass Inner Bevel Ring (creates realistic thick crystal refraction) */}
          <rect
            x="74"
            y="39"
            width="232"
            height="202"
            rx="45"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.12"
            strokeWidth="2"
          />

          {/* 5. Prismatic Light Ray Streaks inside Glass */}
          <path
            d="M85 45L220 220"
            stroke="url(#glassGlare)"
            strokeWidth="28"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M135 45L270 190"
            stroke="#FFFFFF"
            strokeOpacity="0.08"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* 6. Sculpted 3D "T" Monogram - Depth Extrusions */}
          {/* Stem Extrusion */}
          <path
            d="M165 125L178 135V205L165 195V125Z"
            fill="url(#tDepthGrad)"
          />
          <path
            d="M205 125L218 135V205L205 195V125Z"
            fill="url(#tDepthGrad)"
          />

          {/* Top Bar Bottom Depth */}
          <path
            d="M110 115L122 127H258L270 115H110Z"
            fill="#2E1065"
            fillOpacity="0.8"
          />

          {/* 7. Sculpted 3D "T" Monogram - Main Front Face */}
          {/* Top Bar */}
          <rect
            x="112"
            y="76"
            width="156"
            height="38"
            rx="12"
            fill="url(#tFaceGrad)"
            stroke="#FFFFFF"
            strokeOpacity="0.3"
            strokeWidth="1.5"
          />

          {/* Vertical Stem */}
          <rect
            x="166"
            y="110"
            width="48"
            height="86"
            rx="12"
            fill="url(#tFaceGrad)"
            stroke="#FFFFFF"
            strokeOpacity="0.25"
            strokeWidth="1.5"
          />

          {/* Chamfered Left Wing Facet */}
          <path
            d="M112 88C112 81.3726 117.373 76 124 76H152L138 114H112V88Z"
            fill="#FFFFFF"
            fillOpacity="0.25"
          />

          {/* Center Stem Crystal Highlight Crease */}
          <path
            d="M190 114V192"
            stroke="#FFFFFF"
            strokeOpacity="0.6"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Top Bar Specular Glint */}
          <path
            d="M120 78H260"
            stroke="url(#tSpecularEdge)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* 8. Glass Surface Corner Specular Flare (Top Right Corner) */}
          <ellipse
            cx="285"
            cy="52"
            rx="24"
            ry="12"
            transform="rotate(35 285 52)"
            fill="#FFFFFF"
            fillOpacity="0.45"
            filter="blur(3px)"
          />

          {/* 9. Glass Surface Bottom Left Specular Glint */}
          <ellipse
            cx="95"
            cy="225"
            rx="20"
            ry="8"
            transform="rotate(-25 95 225)"
            fill="#C084FC"
            fillOpacity="0.4"
            filter="blur(2px)"
          />

          {/* 10. Floating Ambient Amethyst Sparkle Particles */}
          <circle cx="90" cy="70" r="2.5" fill="#FFFFFF" fillOpacity="0.8" />
          <circle cx="295" cy="180" r="2" fill="#E9D5FF" fillOpacity="0.7" />
          <circle cx="80" cy="185" r="1.5" fill="#C084FC" fillOpacity="0.6" />
          <circle cx="280" cy="100" r="3" fill="#FFFFFF" fillOpacity="0.9" />

          {/* 11. Floor Mirror Inverted Reflection of "T" */}
          <g opacity="0.35" transform="scale(1, -0.45) translate(0, -710)">
            <rect x="122" y="76" width="136" height="32" rx="10" fill="#A855F7" filter="blur(6px)" />
            <rect x="170" y="106" width="40" height="70" rx="10" fill="#A855F7" filter="blur(6px)" />
          </g>
        </svg>

        {/* Brand Logotype Beneath with Floor Reflection (Matching Panel 1) */}
        <div className="flex flex-col items-center mt-1">
          <div className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-baseline">
            Tip<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-purple-400">ZeMe</span>
            <span className="text-xs ml-0.5 text-violet-400/80 font-normal">™</span>
          </div>

          {/* Inverted Mirror Floor Reflection of Text */}
          <div
            className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-violet-400/20 flex items-baseline select-none transform scale-y-[-0.6] blur-[2px] -mt-1 pointer-events-none"
            aria-hidden="true"
          >
            TipZeMe™
          </div>
        </div>
      </div>
    </div>
  );
}
