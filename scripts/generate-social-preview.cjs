const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WIDTH = 1200;
const HEIGHT = 630;

const svgContent = `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradients -->
    <radialGradient id="bgGlowCenter" cx="50%" cy="55%" r="60%">
      <stop offset="0%" stop-color="#2E1065" stop-opacity="0.8" />
      <stop offset="40%" stop-color="#1E1B4B" stop-opacity="0.6" />
      <stop offset="75%" stop-color="#090514" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#040208" stop-opacity="1" />
    </radialGradient>

    <radialGradient id="leftAmbient" cx="15%" cy="30%" r="45%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.35" />
      <stop offset="50%" stop-color="#4F46E5" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#040208" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="rightAmbient" cx="85%" cy="40%" r="45%">
      <stop offset="0%" stop-color="#A855F7" stop-opacity="0.3" />
      <stop offset="50%" stop-color="#3B82F6" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#040208" stop-opacity="0" />
    </radialGradient>

    <!-- Neon Ribbon Gradients -->
    <linearGradient id="neonRibbonLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06B6D4" stop-opacity="0.9" />
      <stop offset="30%" stop-color="#8B5CF6" stop-opacity="0.8" />
      <stop offset="70%" stop-color="#C084FC" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#4F46E5" stop-opacity="0" />
    </linearGradient>

    <linearGradient id="neonRibbonRight" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0" />
      <stop offset="40%" stop-color="#A855F7" stop-opacity="0.75" />
      <stop offset="80%" stop-color="#E879F9" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.85" />
    </linearGradient>

    <!-- Phone Frame & Surface Gradients -->
    <linearGradient id="phoneBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" stop-opacity="0.9" />
      <stop offset="30%" stop-color="#38BDF8" stop-opacity="0.8" />
      <stop offset="70%" stop-color="#7C3AED" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#E879F9" stop-opacity="0.95" />
    </linearGradient>

    <linearGradient id="phoneScreenBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0F0C20" />
      <stop offset="100%" stop-color="#070510" />
    </linearGradient>

    <!-- Logo Gradients -->
    <linearGradient id="logoZeMe" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E9D5FF" />
      <stop offset="30%" stop-color="#C084FC" />
      <stop offset="70%" stop-color="#A855F7" />
      <stop offset="100%" stop-color="#818CF8" />
    </linearGradient>

    <linearGradient id="orbitRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22D3EE" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#C084FC" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#E879F9" stop-opacity="0.9" />
    </linearGradient>

    <linearGradient id="coinGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="40%" stop-color="#FACC15" />
      <stop offset="80%" stop-color="#CA8A04" />
      <stop offset="100%" stop-color="#854D0E" />
    </linearGradient>

    <linearGradient id="coinPurple" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E9D5FF" />
      <stop offset="50%" stop-color="#A855F7" />
      <stop offset="100%" stop-color="#581C87" />
    </linearGradient>

    <linearGradient id="jarGlass" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A78BFA" stop-opacity="0.4" />
      <stop offset="40%" stop-color="#6366F1" stop-opacity="0.15" />
      <stop offset="80%" stop-color="#8B5CF6" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.5" />
    </linearGradient>

    <linearGradient id="paperPlaneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F5F3FF" />
      <stop offset="35%" stop-color="#C084FC" />
      <stop offset="80%" stop-color="#7C3AED" />
      <stop offset="100%" stop-color="#4F46E5" />
    </linearGradient>

    <!-- Filters -->
    <filter id="glowHeavy" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="glowMed" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="25" flood-color="#000000" flood-opacity="0.8" />
    </filter>
  </defs>

  <!-- Base Dark Canvas -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#040208" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGlowCenter)" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#leftAmbient)" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#rightAmbient)" />

  <!-- Ambient Light Streaks & Cosmic Ribbons -->
  <path d="M -50,180 C 150,50 350,220 220,380 C 100,520 -80,450 -50,180 Z" fill="none" stroke="url(#neonRibbonLeft)" stroke-width="12" opacity="0.65" filter="url(#glowHeavy)" />
  <path d="M 1250,120 C 1050,180 820,320 980,500 C 1100,620 1280,520 1250,120 Z" fill="none" stroke="url(#neonRibbonRight)" stroke-width="16" opacity="0.6" filter="url(#glowHeavy)" />

  <!-- Floor Gloss Reflection Line -->
  <ellipse cx="600" cy="565" rx="550" ry="45" fill="#581C87" opacity="0.22" filter="url(#glowHeavy)" />
  <ellipse cx="600" cy="550" rx="360" ry="22" fill="#7C3AED" opacity="0.3" filter="url(#glowMed)" />

  <!-- ================= TOP HEADER BRANDING ================= -->
  <g transform="translate(600, 105)" text-anchor="middle">
    <!-- Stylized 3D Monogram Emblem -->
    <g transform="translate(-240, -18)">
      <!-- Orbital Halo Ring -->
      <ellipse cx="26" cy="18" rx="46" ry="16" fill="none" stroke="url(#orbitRing)" stroke-width="5" transform="rotate(-18 26 18)" filter="url(#glowMed)" />
      <!-- Monogram 'T' / 'P' Shape -->
      <path d="M 8,-12 L 48,-12 C 54,-12 58,-8 56,-2 L 48,16 C 45,22 39,26 32,26 L 24,26 L 14,48 L 0,48 L 16,14 L 28,14 C 33,14 36,12 37,9 L 41,-1 L 12,-1 Z" fill="url(#logoZeMe)" filter="url(#glowMed)" />
    </g>

    <!-- Brand Typography "TipZeMe" -->
    <text x="30" y="8" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-weight="900" font-size="80" letter-spacing="-2">
      <tspan fill="#FFFFFF">Tip</tspan>
      <tspan fill="url(#logoZeMe)">ZeMe</tspan>
      <tspan fill="#A855F7" font-size="28" dy="-38">TM</tspan>
    </text>

    <!-- Subtitle: CREATE • SHARE • RECEIVE TIPS -->
    <text x="30" y="48" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-weight="800" font-size="16" letter-spacing="9" fill="#E2E8F0" opacity="0.95">
      CREATE  •  SHARE  •  RECEIVE TIPS
    </text>
  </g>

  <!-- ================= LEFT: GLOWING GLASS TIP JAR ================= -->
  <g transform="translate(240, 420)" filter="url(#softShadow)">
    <!-- Jar Sparks Above -->
    <g transform="translate(0, -145)" stroke="#DDD6FE" stroke-width="3" stroke-linecap="round" filter="url(#glowMed)">
      <line x1="-28" y1="12" x2="-40" y2="0" />
      <line x1="0" y1="4" x2="0" y2="-14" />
      <line x1="28" y1="12" x2="40" y2="0" />
    </g>

    <!-- Jar Glass Body -->
    <path d="M -65,-95 C -65,-105 -50,-110 0,-110 C 50,-110 65,-105 65,-95 L 75,55 C 75,80 55,95 0,95 C -55,95 -75,80 -75,55 Z" fill="url(#jarGlass)" stroke="url(#phoneBorder)" stroke-width="3.5" filter="url(#glowMed)" />
    
    <!-- Glass Highlights -->
    <path d="M -60,-80 C -60,-80 -68,0 -68,40" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.6" fill="none" />
    <ellipse cx="0" cy="-98" rx="55" ry="12" fill="none" stroke="#C084FC" stroke-width="3" />

    <!-- Coins Inside & Stacked Around -->
    <!-- Inside Gold Coins -->
    <g transform="translate(-18, 45) rotate(-15)">
      <ellipse cx="0" cy="0" rx="32" ry="14" fill="url(#coinGold)" stroke="#FEF08A" stroke-width="2" />
      <ellipse cx="0" cy="-3" rx="26" ry="10" fill="none" stroke="#FACC15" stroke-width="1.5" />
      <text x="0" y="2" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="14" fill="#78350F">T</text>
    </g>

    <g transform="translate(20, 32) rotate(20)">
      <ellipse cx="0" cy="0" rx="30" ry="13" fill="url(#coinPurple)" stroke="#E9D5FF" stroke-width="2" />
      <text x="0" y="2" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="14" fill="#3B0764">T</text>
    </g>

    <g transform="translate(2, 60)">
      <ellipse cx="0" cy="0" rx="34" ry="14" fill="url(#coinGold)" stroke="#FEF08A" stroke-width="2" />
      <text x="0" y="2" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="14" fill="#78350F">T</text>
    </g>

    <!-- Foreground Leaning Coin Outside -->
    <g transform="translate(-85, 75) rotate(-22)" filter="url(#glowMed)">
      <ellipse cx="0" cy="0" rx="32" ry="32" fill="url(#coinGold)" stroke="#FEF08A" stroke-width="3" />
      <circle cx="0" cy="0" r="23" fill="none" stroke="#FACC15" stroke-width="1.5" stroke-dasharray="4 2" />
      <text x="0" y="8" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="24" fill="#78350F">T</text>
    </g>

    <!-- Jar Front Emblem -->
    <g transform="translate(0, -10)">
      <circle cx="0" cy="0" r="24" fill="#3B0764" opacity="0.75" />
      <text x="0" y="9" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="28" fill="#F5F3FF" filter="url(#glowMed)">T</text>
    </g>
  </g>

  <!-- ================= CENTER: 3D SMARTPHONE DISPLAY ================= -->
  <g transform="translate(600, 420)" filter="url(#softShadow)">
    <!-- Phone Outer Case / Neon Rim -->
    <rect x="-155" y="-220" width="310" height="430" rx="44" fill="#0A0818" stroke="url(#phoneBorder)" stroke-width="5" filter="url(#glowMed)" />

    <!-- Phone Inner Screen -->
    <rect x="-144" y="-208" width="288" height="406" rx="36" fill="url(#phoneScreenBg)" />

    <!-- Screen Speaker / Dynamic Island Notch -->
    <rect x="-35" y="-196" width="70" height="12" rx="6" fill="#1E1B4B" />

    <!-- Screen Content -->
    <!-- Mini Logo -->
    <g transform="translate(0, -165)" text-anchor="middle">
      <text x="0" y="0" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="17" fill="#FFFFFF">
        Tip<tspan fill="#C084FC">ZeMe</tspan>
      </text>
    </g>

    <!-- Avatar Placeholder -->
    <g transform="translate(0, -125)">
      <circle cx="0" cy="0" r="26" fill="#2E1065" stroke="#7C3AED" stroke-width="2.5" />
      <circle cx="0" cy="-6" r="10" fill="#C084FC" />
      <path d="M -14,14 C -14,2 14,2 14,14 Z" fill="#C084FC" />
    </g>

    <!-- Screen Heading: "Support My Work" -->
    <text x="0" y="-78" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="17" fill="#FFFFFF">
      Support My Work
    </text>

    <!-- Tip Preset Chips: $5, $10 (selected), $25 -->
    <g transform="translate(0, -42)">
      <!-- $5 Chip -->
      <g transform="translate(-80, 0)">
        <rect x="-28" y="-18" width="56" height="36" rx="12" fill="#181330" stroke="#3730A3" stroke-width="1.5" />
        <text x="0" y="5" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="14" fill="#94A3B8">$5</text>
      </g>

      <!-- $10 Chip (Glowing Active State) -->
      <g transform="translate(0, 0)" filter="url(#glowMed)">
        <rect x="-32" y="-20" width="64" height="40" rx="14" fill="#581C87" stroke="#E879F9" stroke-width="2.5" />
        <text x="0" y="6" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="16" fill="#FFFFFF">$10</text>
      </g>

      <!-- $25 Chip -->
      <g transform="translate(80, 0)">
        <rect x="-28" y="-18" width="56" height="36" rx="12" fill="#181330" stroke="#3730A3" stroke-width="1.5" />
        <text x="0" y="5" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="14" fill="#94A3B8">$25</text>
      </g>
    </g>

    <!-- Custom Amount Field -->
    <g transform="translate(0, 20)">
      <rect x="-115" y="-16" width="230" height="34" rx="12" fill="#13102B" stroke="#2E2555" stroke-width="1.5" />
      <text x="0" y="6" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="12" fill="#94A3B8">Custom Amount</text>
    </g>

    <!-- Large CTA Button: Send a Tip -->
    <g transform="translate(0, 80)" filter="url(#glowMed)">
      <rect x="-115" y="-22" width="230" height="46" rx="16" fill="url(#logoZeMe)" />
      <!-- Paper Airplane Icon -->
      <path d="M -55,-5 L -40,-1 L -44,7 L -48,2 L -55,-5 Z" fill="#FFFFFF" />
      <text x="10" y="5" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="16" fill="#FFFFFF">
        Send a Tip
      </text>
    </g>

    <!-- Glossy diagonal screen reflection sweep -->
    <path d="M -140,-200 L 40,-200 L -140,-20 Z" fill="#FFFFFF" opacity="0.04" />
  </g>

  <!-- ================= RIGHT: 3D QR CODE & FLYING PAPER AIRPLANE ================= -->
  <!-- 3D QR Code Stand -->
  <g transform="translate(930, 460)" filter="url(#softShadow)">
    <!-- Stand Outer Box -->
    <rect x="-85" y="-85" width="170" height="170" rx="34" fill="#0C0A1E" stroke="url(#phoneBorder)" stroke-width="4.5" filter="url(#glowMed)" />
    
    <!-- QR Matrix Background -->
    <rect x="-70" y="-70" width="140" height="140" rx="22" fill="#080614" />

    <!-- Corner Targets -->
    <!-- Top-Left -->
    <rect x="-55" y="-55" width="36" height="36" rx="8" fill="none" stroke="#E2E8F0" stroke-width="5" />
    <rect x="-47" y="-47" width="20" height="20" rx="4" fill="#C084FC" />

    <!-- Top-Right -->
    <rect x="19" y="-55" width="36" height="36" rx="8" fill="none" stroke="#E2E8F0" stroke-width="5" />
    <rect x="27" y="-47" width="20" height="20" rx="4" fill="#C084FC" />

    <!-- Bottom-Left -->
    <rect x="-55" y="19" width="36" height="36" rx="8" fill="none" stroke="#E2E8F0" stroke-width="5" />
    <rect x="-47" y="27" width="20" height="20" rx="4" fill="#C084FC" />

    <!-- QR Internal Data Pixels -->
    <g fill="#E2E8F0">
      <rect x="-10" y="-52" width="10" height="10" rx="2" />
      <rect x="3" y="-52" width="8" height="10" rx="2" />
      <rect x="-12" y="-35" width="14" height="8" rx="2" fill="#38BDF8" />
      <rect x="-50" y="-10" width="10" height="18" rx="2" />
      <rect x="25" y="-10" width="16" height="10" rx="2" fill="#E879F9" />
      <rect x="3" y="5" width="12" height="12" rx="2" />
      <rect x="-12" y="22" width="16" height="10" rx="2" />
      <rect x="18" y="22" width="14" height="14" rx="2" fill="#38BDF8" />
      <rect x="38" y="22" width="12" height="28" rx="2" />
      <rect x="18" y="42" width="14" height="10" rx="2" />
    </g>

    <!-- QR Center Badge with 'P' / 'T' Emblem -->
    <rect x="-20" y="-20" width="40" height="40" rx="10" fill="#581C87" stroke="#A855F7" stroke-width="2.5" />
    <text x="0" y="7" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="20" fill="#FFFFFF">P</text>
  </g>

  <!-- 3D Paper Airplane Flying Upward -->
  <g transform="translate(980, 260) rotate(-22)" filter="url(#glowHeavy)">
    <!-- Light Trail / Streamer -->
    <path d="M -140,80 C -80,60 -20,30 20,0" stroke="url(#neonRibbonRight)" stroke-width="8" stroke-linecap="round" fill="none" filter="url(#glowMed)" />

    <!-- 3D Origami Airplane Body -->
    <path d="M 0,-40 L 70,55 L 0,35 L -70,55 Z" fill="url(#paperPlaneGrad)" stroke="#FFFFFF" stroke-width="2" />
    <!-- Wing Crease Shadows -->
    <path d="M 0,-40 L 0,35 L 70,55 Z" fill="#4338CA" opacity="0.45" />
    <path d="M 0,-40 L 0,35 L -70,55 Z" fill="#F5F3FF" opacity="0.3" />
    <!-- Inner Keel -->
    <path d="M 0,35 L 0,55 L 12,42 Z" fill="#2E1065" />
  </g>

  <!-- Ambient Sparkling Micro-Particles -->
  <g fill="#FFFFFF" opacity="0.8">
    <circle cx="160" cy="220" r="2.5" filter="url(#glowMed)" />
    <circle cx="430" cy="280" r="3" filter="url(#glowMed)" />
    <circle cx="820" cy="210" r="2" filter="url(#glowMed)" />
    <circle cx="1060" cy="180" r="3.5" filter="url(#glowMed)" />
    <circle cx="340" cy="550" r="2" />
    <circle cx="860" cy="560" r="2.5" />
  </g>
</svg>
`;

async function generate() {
  const publicDir = path.resolve(__dirname, '../public');
  const imagesDir = path.join(publicDir, 'images');

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const svgBuffer = Buffer.from(svgContent);

  // 1. Generate High-Quality JPEG at 1200x630
  const jpgPath = path.join(imagesDir, 'tipzeme-social-preview.jpg');
  await sharp(svgBuffer)
    .resize(WIDTH, HEIGHT)
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toFile(jpgPath);

  console.log(`[Success] Generated ${jpgPath} (${fs.statSync(jpgPath).size} bytes)`);

  // 2. Generate WebP at 1200x630
  const webpPath = path.join(imagesDir, 'tipzeme-social-preview.webp');
  await sharp(svgBuffer)
    .resize(WIDTH, HEIGHT)
    .webp({ quality: 95 })
    .toFile(webpPath);

  console.log(`[Success] Generated ${webpPath} (${fs.statSync(webpPath).size} bytes)`);
}

generate().catch((err) => {
  console.error('[Error generating preview]:', err);
  process.exit(1);
});
