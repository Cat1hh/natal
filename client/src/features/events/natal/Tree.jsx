import React, { useEffect, useMemo, useRef } from 'react';

const SPOTS = [
  [150, 76],
  [124, 130],
  [176, 134],
  [150, 154],
  [102, 186],
  [198, 190],
  [132, 206],
  [168, 210],
  [84, 250],
  [124, 266],
  [176, 266],
  [216, 250],
];

const REGION_COORDS = {
  esquerda: { x: 24, y: 214, w: 48, h: 64 },
  base: { x: 126, y: 274, w: 48, h: 58 },
  direita: { x: 228, y: 214, w: 48, h: 64 },
};

const LIGHTS = [
  [112, 113], [131, 119], [150, 121], [169, 119], [188, 113],
  [90, 167], [120, 175], [150, 178], [180, 175], [210, 167],
  [70, 225], [110, 235], [150, 239], [190, 235], [230, 225],
];

const BALLS = [
  [136, 94], [164, 98],
  [114, 146], [186, 150],
  [96, 202], [204, 205],
  [76, 262], [224, 264],
];

const SWAGS = [
  'M 108 111 Q 150 128 192 111',
  'M 86 165 Q 150 186 214 165',
  'M 66 223 Q 150 248 234 223',
];

const TIERS = [
  'M 150 170 C 118 215, 78 258, 44 285 Q 68 295, 92 286 Q 120 298, 150 288 Q 180 298, 208 286 Q 232 295, 256 285 C 222 258, 182 215, 150 170 Z',
  'M 150 122 C 122 162, 90 198, 62 225 Q 88 235, 114 225 Q 150 238, 186 225 Q 212 235, 238 225 C 210 198, 178 162, 150 122 Z',
  'M 150 80 C 128 112, 104 142, 82 167 Q 108 176, 132 167 Q 150 175, 168 167 Q 192 176, 218 167 C 196 142, 172 112, 150 80 Z',
  'M 150 44 C 136 70, 120 94, 104 113 Q 127 121, 150 113 Q 173 121, 196 113 C 180 94, 164 70, 150 44 Z',
];

export function Tree({ letters = [], ornaments = [], isHeaven = false, onOpen }) {
  const ballGrads = ['url(#bR)', 'url(#bG)', 'url(#bC)'];
  const lightColors = ['#F4A51D', '#A81E23', '#F1E4D4'];

  const approvedSprites = useMemo(() => {
    const pool = [
      ...(Array.isArray(ornaments) ? ornaments : []),
      ...(Array.isArray(letters) ? letters.filter((item) => item?.imageUrl) : []),
    ];
    const byRegion = {};
    for (const item of pool) {
      const reg = String(item?.region || 'base').toLowerCase();
      if (REGION_COORDS[reg] && item?.imageUrl && !byRegion[reg]) {
        byRegion[reg] = item;
      }
    }
    return Object.entries(byRegion);
  }, [letters, ornaments]);

  const plaqueTitle = isHeaven ? 'BOSQUE HEAVEN' : 'CASTELO KINGDOM';
  const clueFragment = isHeaven ? 'ZE' : 'TRE';

  return (
    <svg
      className="tree"
      viewBox="0 0 300 350"
      role="img"
      aria-label={`Árvore de Natal · ${plaqueTitle} · Placa Pista 02: ${clueFragment}`}
    >
      <defs>
        {/* Folhagem Verde Pinheiro (#575C27) */}
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6e7432" />
          <stop offset="50%" stopColor="#575C27" />
          <stop offset="100%" stopColor="#262910" />
        </linearGradient>

        {/* Tronco Bronze/Madeira (#A46227) */}
        <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#593211" />
          <stop offset="45%" stopColor="#A46227" />
          <stop offset="100%" stopColor="#47270c" />
        </linearGradient>

        {/* Base Creme (#F1E4D4) */}
        <radialGradient id="snowBase">
          <stop offset="0%" stopColor="#F1E4D4" stopOpacity="0.26" />
          <stop offset="70%" stopColor="#F1E4D4" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#F1E4D4" stopOpacity="0" />
        </radialGradient>

        {/* Halo Dourado (#F4A51D) */}
        <radialGradient id="gl">
          <stop offset="0%" stopColor="#F4A51D" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#F4A51D" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#F4A51D" stopOpacity="0" />
        </radialGradient>

        {/* Bola Carmesim (#A81E23) */}
        <radialGradient id="bR" cx="0.35" cy="0.3">
          <stop offset="0%" stopColor="#F1E4D4" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#A81E23" />
          <stop offset="100%" stopColor="#45080b" />
        </radialGradient>

        {/* Bola Dourada (#F4A51D) */}
        <radialGradient id="bG" cx="0.35" cy="0.3">
          <stop offset="0%" stopColor="#F1E4D4" stopOpacity="0.95" />
          <stop offset="42%" stopColor="#F4A51D" />
          <stop offset="100%" stopColor="#7a4612" />
        </radialGradient>

        {/* Bola Creme (#F1E4D4) */}
        <radialGradient id="bC" cx="0.35" cy="0.3">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#F1E4D4" />
          <stop offset="100%" stopColor="#9c8a74" />
        </radialGradient>

        <filter id="boughShadow" x="-15%" y="-10%" width="130%" height="135%">
          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#000000" floodOpacity="0.65" />
        </filter>
      </defs>

      {/* Silhueta sutil do cenário (Bosque da Heaven vs Castelo Kingdom) */}
      {isHeaven ? (
        <g opacity="0.14" fill="#F1E4D4" aria-hidden="true">
          <path d="M 18 328 L 36 258 L 54 328 Z" />
          <path d="M 244 328 L 264 252 L 284 328 Z" />
          <circle cx="46" cy="64" r="1.5" />
          <circle cx="256" cy="78" r="1.8" />
        </g>
      ) : (
        <g opacity="0.14" fill="#F1E4D4" aria-hidden="true">
          <path d="M 22 328 L 22 272 L 30 272 L 30 280 L 38 280 L 38 272 L 46 272 L 46 328 Z" />
          <path d="M 254 328 L 254 268 L 262 268 L 262 276 L 270 276 L 270 268 L 278 268 L 278 328 Z" />
        </g>
      )}

      <ellipse cx="150" cy="334" rx="118" ry="14" fill="url(#snowBase)" />

      {/* Brilho e raios da estrela */}
      <circle cx="150" cy="30" r="44" fill="url(#gl)" className="star" />
      <g className="rays" stroke="#F4A51D" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round">
        {[0, 45, 90, 135].map((a) => (
          <line key={a} x1="150" y1="3" x2="150" y2="57" transform={`rotate(${a} 150 30)`} />
        ))}
      </g>

      {/* Tronco */}
      <path
        d="M 137 284 L 163 284 L 167 332 Q 150 337 133 332 Z"
        fill="url(#trunkGrad)"
        stroke="#F1E4D4"
        strokeOpacity="0.25"
        strokeWidth="1"
      />

      {/* Galhos orgânicos */}
      <g filter="url(#boughShadow)">
        {TIERS.map((d, idx) => (
          <path
            key={idx}
            d={d}
            fill="url(#tg)"
            stroke="#F4A51D"
            strokeOpacity={0.28 + idx * 0.06}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        ))}
      </g>

      {/* Nervuras internas */}
      <g stroke="#F1E4D4" strokeOpacity="0.12" strokeWidth="1.1" fill="none" strokeLinecap="round">
        <path d="M 150 62 Q 134 88 118 106" />
        <path d="M 150 62 Q 166 88 182 106" />
        <path d="M 150 132 Q 124 168 96 212" />
        <path d="M 150 132 Q 176 168 204 212" />
        <path d="M 150 185 Q 112 232 72 274" />
        <path d="M 150 185 Q 188 232 228 274" />
      </g>

      {/* Festões dourados */}
      {SWAGS.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="#F4A51D"
          strokeOpacity="0.72"
          strokeWidth="1.8"
          strokeDasharray="1 5"
          strokeLinecap="round"
        />
      ))}

      {/* Pisca-pisca */}
      {LIGHTS.map(([x, y], i) => (
        <circle
          key={i}
          className="lt"
          cx={x}
          cy={y}
          r="3.3"
          fill={lightColors[i % lightColors.length]}
          style={{ animationDelay: `${i * 0.27}s` }}
        />
      ))}

      {/* Bolas de Natal */}
      {BALLS.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="6.5" fill={ballGrads[i % ballGrads.length]} />
          <circle cx={x - 2} cy={y - 2.2} r="1.4" fill="#F1E4D4" opacity="0.85" />
        </g>
      ))}

      {/* Estrela Dourada */}
      <g className="star">
        <path
          d="M150 9 L154.5 23.5 L169 24.5 L157.5 33.5 L161.5 47.5 L150 39 L138.5 47.5 L142.5 33.5 L131 24.5 L145.5 23.5 Z"
          fill="#F4A51D"
          stroke="#F1E4D4"
          strokeWidth="0.6"
        />
        <circle cx="150" cy="30" r="2.8" fill="#F1E4D4" />
      </g>

      {/* Personagens PNG transparente aprovados nas regiões esquerda, base e direita */}
      {approvedSprites.map(([reg, item]) => {
        const box = REGION_COORDS[reg];
        return (
          <g
            key={reg}
            className={onOpen ? 'env' : 'env off'}
            onClick={() => onOpen?.(item)}
            style={{ cursor: onOpen ? 'pointer' : 'default' }}
          >
            <image
              href={item.imageUrl}
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              preserveAspectRatio="xMidYMax meet"
            />
          </g>
        );
      })}

      {/* Cartinhas e enfeites pendurados */}
      {letters.slice(0, 12).map((l, i) => (
        <g
          key={l.id ?? i}
          transform={`translate(${SPOTS[i][0]},${SPOTS[i][1]})`}
          className={onOpen ? 'env' : 'env off'}
          role={onOpen ? 'button' : undefined}
          tabIndex={onOpen ? 0 : -1}
          aria-label={onOpen ? `Ler mensagem de ${l.author || 'Anônimo'}` : undefined}
          onClick={() => onOpen?.(l)}
          onKeyDown={(e) => e.key === 'Enter' && onOpen?.(l)}
        >
          <g className="sw" style={{ animationDelay: `${-i * 0.4}s` }}>
            <line y1="-8" y2="-14" stroke="#F4A51D" strokeWidth="1.2" />
            <rect x="-12" y="-8" width="24" height="17" rx="2.5" fill="#F1E4D4" />
            <path d="M-12 -8 L0 2 L12 -8" fill="none" stroke="#A81E23" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cy="2" r="2.6" fill="#A81E23" />
          </g>
        </g>
      ))}

      {/* Placa da Árvore (Cenário + Fragmento 2/3 da Caça às pistas) */}
      <g transform="translate(12, 294)">
        <rect x="38" y="26" width="8" height="16" rx="2" fill="#593211" />
        <rect
          x="0"
          y="0"
          width="84"
          height="28"
          rx="4"
          fill="#3c210b"
          stroke="#F4A51D"
          strokeOpacity="0.65"
          strokeWidth="1"
        />
        <text
          x="42"
          y="11"
          textAnchor="middle"
          fill="#F1E4D4"
          fontSize="6.4"
          fontWeight="700"
          letterSpacing="0.4"
        >
          {plaqueTitle}
        </text>
        <text
          x="42"
          y="21.5"
          textAnchor="middle"
          fill="#F4A51D"
          fontSize="7.4"
          fontWeight="800"
          letterSpacing="0.8"
        >
          PISTA 02: {clueFragment}
        </text>
      </g>
    </svg>
  );
}

export function Snow() {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, x = c.getContext('2d');
    let W, H, raf;
    const fit = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
    fit();
    addEventListener('resize', fit);
    const F = Array.from({ length: 90 }, (_, i) => ({
      x: Math.random() * W, y: Math.random() * H, d: Math.random() * 6,
      r: i % 3 ? 1 + Math.random() * 1.8 : 2.6 + Math.random() * 2,
      s: i % 3 ? 0.35 + Math.random() * 0.5 : 0.9 + Math.random() * 0.8,
    }));
    const draw = (t) => {
      x.clearRect(0, 0, W, H);
      for (const p of F) {
        p.y += p.s; p.x += Math.sin(t / 1300 + p.d) * 0.5;
        if (p.y > H + 5) { p.y = -5; p.x = Math.random() * W; }
        x.fillStyle = `rgba(241, 228, 212, ${p.r > 2.5 ? 0.88 : 0.5})`;
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw(0);
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) cancelAnimationFrame(raf);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); };
  }, []);
  return <canvas ref={ref} className="snow" aria-hidden="true" />;
}

export function Burst() {
  const palette = ['#A81E23', '#F4A51D', '#575C27', '#F1E4D4'];
  const bits = useMemo(
    () => Array.from({ length: 40 }, (_, i) => {
      const a = (i / 40) * Math.PI * 2, d = 90 + Math.random() * 190, s = 6 + Math.random() * 6;
      return { x: Math.cos(a) * d, y: Math.sin(a) * d - 60, s, c: palette[i % palette.length] };
    }),
    []
  );
  return (
    <div className="burst" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} style={{ '--x': `${b.x}px`, '--y': `${b.y}px`, width: b.s, height: b.s * 1.6, background: b.c }} />
      ))}
    </div>
  );
}

export function MagicCursor() {
  const ref = useRef();

  useEffect(() => {
    if (
      matchMedia('(pointer: coarse)').matches ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;

    const c = ref.current;
    const ctx = c.getContext('2d');
    let W, H, raf;
    const sparks = [];
    const colors = ['#F4A51D', '#F1E4D4', '#A81E23'];

    const fit = () => {
      W = c.width = innerWidth;
      H = c.height = innerHeight;
    };
    fit();
    addEventListener('resize', fit);

    const onMove = (e) => {
      for (let i = 0; i < 2; i++) {
        sparks.push({
          x: e.clientX + (Math.random() - 0.5) * 6,
          y: e.clientY + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.9,
          vy: 0.4 + Math.random() * 0.9,
          r: 1.5 + Math.random() * 2,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      if (sparks.length > 70) sparks.splice(0, sparks.length - 70);
    };
    addEventListener('mousemove', onMove, { passive: true });

    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.032;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', fit);
      removeEventListener('mousemove', onMove);
    };
  }, []);

  return <canvas ref={ref} className="snow" style={{ zIndex: 45 }} aria-hidden="true" />;
}