// PresetAvatars.jsx
//
// Football-themed preset avatars — a cohesive "squad" of 8 flat-illustration
// player portraits: 4 men + 4 women across Black, White, Asian and mixed
// heritage, each in a distinct club-kit colour. Now holding a ball + rosy
// cheeks, to match the "flat sports-avatar" reference look.

const TONE = {
    deep:  { skin: '#5E3A22', shadow: '#472C1A' },
    brown: { skin: '#8A5A34', shadow: '#6C4526' },
    tan:   { skin: '#DBA875', shadow: '#C08F5D' },
    fair:  { skin: '#F0C6A0', shadow: '#DCAE86' },
};

export const PRESET_AVATARS = [
    {
        slug: 'striker-crimson',
        label: 'Striker · crimson kit',
        gender: 'm',
        hairStyle: 'fade',
        hair: '#15100C',
        ...TONE.deep,
        kit: '#DC2E3E',
        kitDark: '#A81F2C',
        accent: '#F8FAFC',
        bg1: '#2A151A',
    },
    {
        slug: 'mid-royal',
        label: 'Midfielder · royal-blue kit',
        gender: 'm',
        hairStyle: 'side-part',
        hair: '#6E4E2E',
        ...TONE.fair,
        kit: '#2F6BE4',
        kitDark: '#1E4BAF',
        accent: '#F8FAFC',
        bg1: '#14213A',
    },
    {
        slug: 'defender-emerald',
        label: 'Defender · emerald kit',
        gender: 'm',
        hairStyle: 'straight-fringe',
        hair: '#14100D',
        ...TONE.tan,
        kit: '#12A66B',
        kitDark: '#0B7D50',
        accent: '#F0FFF8',
        bg1: '#0E2A20',
    },
    {
        slug: 'winger-amber',
        label: 'Winger · amber kit',
        gender: 'm',
        hairStyle: 'curly-short',
        hair: '#211710',
        ...TONE.brown,
        kit: '#F0A519',
        kitDark: '#C4820C',
        accent: '#1A1206',
        bg1: '#2C2410',
    },
    {
        slug: 'playmaker-violet',
        label: 'Playmaker · violet kit',
        gender: 'w',
        hairStyle: 'natural-curls',
        hair: '#17110C',
        ...TONE.deep,
        kit: '#7C4DE0',
        kitDark: '#5B32B4',
        accent: '#F5F3FF',
        bg1: '#211538',
        lips: '#7E4A45',
    },
    {
        slug: 'forward-teal',
        label: 'Forward · teal kit',
        gender: 'w',
        hairStyle: 'ponytail',
        hair: '#C79A4E',
        ...TONE.fair,
        kit: '#14B4A6',
        kitDark: '#0E8A80',
        accent: '#EAFFFC',
        bg1: '#0E2A28',
        lips: '#C86A6A',
    },
    {
        slug: 'winger-rose',
        label: 'Winger · rose kit',
        gender: 'w',
        hairStyle: 'long-straight',
        hair: '#14100D',
        ...TONE.tan,
        kit: '#EC5B92',
        kitDark: '#C93C72',
        accent: '#FFF1F6',
        bg1: '#2E1622',
        lips: '#C8586A',
    },
    {
        slug: 'mid-orange',
        label: 'Midfielder · orange kit',
        gender: 'w',
        hairStyle: 'curly-volume',
        hair: '#241912',
        ...TONE.brown,
        kit: '#F4682A',
        kitDark: '#C74E19',
        accent: '#1A0E06',
        bg1: '#2E1B10',
        lips: '#A55A4E',
    },
].map((p) => ({ id: `preset:${p.slug}`, ...p }));

const BY_ID = Object.fromEntries(PRESET_AVATARS.map((p) => [p.id, p]));

function Jersey({ kit, kitDark, accent, gender }) {
    const collar =
        gender === 'w'
            ? 'M44 71 L50 80 L56 71'
            : 'M44 71 C44 76 47 79 50 79 C53 79 56 76 56 71';
    return (
        <g>
            <path
                d="M6 100 C6 84 22 77 38 75 C42 74.5 44 73 44 71 L56 71 C56 73 58 74.5 62 75 C78 77 94 84 94 100 Z"
                fill={kit}
            />
            <path
                d="M56 71 C56 73 58 74.5 62 75 C78 77 94 84 94 100 L62 100 Z"
                fill={kitDark}
                opacity="0.35"
            />
            <path
                d="M40 75 C30 76 20 81 12 91"
                stroke={accent}
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
                opacity="0.9"
            />
            <path
                d="M60 75 C70 76 80 81 88 91"
                stroke={accent}
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
                opacity="0.9"
            />
            <path
                d={collar}
                stroke={accent}
                strokeWidth="2.6"
                fill="none"
                strokeLinecap="round"
            />
        </g>
    );
}

function Head({ skin, shadow }) {
    return (
        <g>
            <circle cx="33.5" cy="47" r="4" fill={skin} />
            <circle cx="66.5" cy="47" r="4" fill={skin} />
            <path
                d="M50 24 C40 24 33 31 33 43 C33 55 41 66 50 66 C59 66 67 55 67 43 C67 31 60 24 50 24 Z"
                fill={skin}
            />
            <path
                d="M50 30 C60 31 66 40 65 50 C63 58 57 65 50 66 C57 60 60 52 60 44 C60 37 56 32 50 30 Z"
                fill={shadow}
                opacity="0.16"
            />
        </g>
    );
}

function Face({ hair, shadow, gender, lips }) {
    const eyeY = 46;
    return (
        <g>
            {/* Rosy cheeks — sits under the eyebrows/eyes, above the mouth */}
            <ellipse cx="37.5" cy="52.5" rx="3.6" ry="2.3" fill="#E8746B" opacity="0.32" />
            <ellipse cx="62.5" cy="52.5" rx="3.6" ry="2.3" fill="#E8746B" opacity="0.32" />

            <path d="M40 41.5 Q43.5 40 47 41.3" stroke={hair} strokeWidth="1.7" fill="none" strokeLinecap="round" />
            <path d="M53 41.3 Q56.5 40 60 41.5" stroke={hair} strokeWidth="1.7" fill="none" strokeLinecap="round" />
            <ellipse cx="43.5" cy={eyeY} rx="2.3" ry="1.8" fill="#2A2320" />
            <ellipse cx="56.5" cy={eyeY} rx="2.3" ry="1.8" fill="#2A2320" />
            <circle cx="44.2" cy={eyeY - 0.6} r="0.55" fill="#fff" opacity="0.85" />
            <circle cx="57.2" cy={eyeY - 0.6} r="0.55" fill="#fff" opacity="0.85" />
            {gender === 'w' && (
                <g stroke="#2A2320" strokeWidth="0.9" strokeLinecap="round">
                    <path d="M41 44.6 l-1.6 -0.7" />
                    <path d="M59 44.6 l1.6 -0.7" />
                </g>
            )}
            <path
                d="M50 47.5 L49 53 Q50 54 51.4 53"
                stroke={shadow}
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
            />
            {gender === 'w' ? (
                <path
                    d="M45.5 57.4 Q50 60.6 54.5 57.4 Q50 59.4 45.5 57.4 Z"
                    fill={lips || '#B4645A'}
                />
            ) : (
                <path
                    d="M45 58 Q50 61 55 58"
                    stroke="#7C4B42"
                    strokeWidth="1.6"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.8"
                />
            )}
        </g>
    );
}

function HairBack({ hairStyle, hair }) {
    switch (hairStyle) {
        case 'natural-curls':
        case 'curly-volume': {
            const offset = hairStyle === 'curly-volume' ? 2 : 0;
            return (
                <g fill={hair}>
                    <ellipse cx={50 + offset} cy="35" rx="29" ry="25" />
                </g>
            );
        }
        case 'long-straight':
            return (
                <g fill={hair}>
                    <path d="M30 30 C19 35 20 58 26 73 L35 73 C31 58 32 41 37 33 Z" />
                    <path d="M70 30 C81 35 80 58 74 73 L65 73 C69 58 68 41 63 33 Z" />
                </g>
            );
        case 'ponytail':
            return (
                <g fill={hair}>
                    <path d="M63 33 C75 33 83 45 80 60 C78 69 73 74 68 76 C71 66 69 51 60 42 Z" />
                </g>
            );
        default:
            return null;
    }
}

function HairFront({ hairStyle, hair }) {
    switch (hairStyle) {
        case 'fade':
            return (
                <path
                    fill={hair}
                    d="M31 42 C29 25 40 19 50 19 C60 19 71 25 69 42 C65 33 58 30 50 30 C42 30 35 33 31 42 Z"
                />
            );
        case 'side-part':
            return (
                <path
                    fill={hair}
                    d="M30 42 C29 24 41 18 51 18 C61 18 70 25 68 41 C64 32 58 29 51 29 C48 29 47 31 46 33 C43 30 37 31 34 36 C32 38 30 40 30 42 Z"
                />
            );
        case 'straight-fringe':
            return (
                <path
                    fill={hair}
                    d="M30 44 C30 23 41 17 50 17 C59 17 70 23 70 44 C67 35 62 32 56 31 L56 38 L51 32 L46 38 L44 31 C38 32 33 36 30 44 Z"
                />
            );
        case 'curly-short':
            return (
                <g fill={hair}>
                    <path d="M31 42 C29 26 40 20 50 20 C60 20 71 26 69 42 C65 34 58 31 50 31 C42 31 35 34 31 42 Z" />
                    {[
                        [37, 24],
                        [43, 21],
                        [50, 20],
                        [57, 21],
                        [63, 24],
                    ].map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r="3.2" />
                    ))}
                </g>
            );
        case 'natural-curls':
        case 'curly-volume': {
            const bumps =
                hairStyle === 'curly-volume'
                    ? [
                          [29, 32],
                          [35, 21],
                          [44, 17],
                          [52, 16],
                          [61, 19],
                          [69, 26],
                          [72, 36],
                      ]
                    : [
                          [30, 31],
                          [36, 22],
                          [44, 18],
                          [50, 17],
                          [56, 18],
                          [64, 22],
                          [70, 31],
                      ];
            return (
                <g fill={hair}>
                    <path d="M32 40 C31 27 40 22 50 22 C60 22 69 27 68 40 C64 33 58 31 50 31 C42 31 36 33 32 40 Z" />
                    {bumps.map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r="4" />
                    ))}
                </g>
            );
        }
        case 'long-straight':
            return (
                <path
                    fill={hair}
                    d="M32 40 C31 26 40 20 50 20 C60 20 69 26 68 40 C64 32 58 30 51 30 L50 24 L49 30 C42 30 36 32 32 40 Z"
                />
            );
        case 'ponytail':
            return (
                <path
                    fill={hair}
                    d="M31 41 C31 24 41 18 50 18 C59 18 69 24 69 41 C66 34 60 31 50 31 C42 31 35 33 31 41 Z"
                />
            );
        default:
            return null;
    }
}

// Simple classic soccer ball — a plain outer circle, a central pentagon, and
// five seam lines radiating out from it. Deliberately generic/iconographic
// (this is just how a soccer ball's panel pattern reads at a glance) rather
// than any specific illustration's ball art.
function SoccerBall() {
    return (
        <g transform="translate(11, 74)">
            <ellipse cx="13" cy="24.5" rx="12" ry="2.6" fill="#000" opacity="0.18" />
            <circle cx="13" cy="13" r="12.5" fill="#F7F7F2" stroke="#1B1B1B" strokeWidth="1.3" />
            <g stroke="#1B1B1B" strokeWidth="1" strokeLinecap="round">
                <line x1="13" y1="8.7" x2="13" y2="1" />
                <line x1="17.09" y1="11.67" x2="24.41" y2="9.29" />
                <line x1="15.53" y1="16.48" x2="20.06" y2="24.71" />
                <line x1="10.47" y1="16.48" x2="5.94" y2="24.71" />
                <line x1="8.91" y1="11.67" x2="1.59" y2="9.29" />
            </g>
            <polygon
                points="13,8.7 17.09,11.67 15.53,16.48 10.47,16.48 8.91,11.67"
                fill="#1B1B1B"
            />
        </g>
    );
}

export function AvatarSVG({ p }) {
    const { slug, skin, shadow, hair, hairStyle, gender, lips } = p;
    const bgId = `psbg-${slug}`;
    return (
        <svg
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            role="img"
            aria-label={p.label}
            preserveAspectRatio="xMidYMid slice"
        >
            <defs>
                <radialGradient id={bgId} cx="50%" cy="36%" r="80%">
                    <stop offset="0%" stopColor={p.bg1} />
                    <stop offset="100%" stopColor="#0E1116" />
                </radialGradient>
            </defs>

            <rect width="100" height="100" fill={`url(#${bgId})`} />
            {/* Soft spotlight behind the head so dark hair stays visible
                against the dark gradient corners. */}
            <ellipse cx="50" cy="40" rx="34" ry="30" fill="#ffffff" opacity="0.14" />
            <ellipse cx="50" cy="104" rx="60" ry="30" fill="#000" opacity="0.15" />

            <Jersey kit={p.kit} kitDark={p.kitDark} accent={p.accent} gender={gender} />
            <HairBack hairStyle={hairStyle} hair={hair} />

            <path d="M43.5 62 L56.5 62 L58 80 L42 80 Z" fill={skin} />
            <ellipse cx="50" cy="63.5" rx="8" ry="3" fill={shadow} opacity="0.2" />

            <Head skin={skin} shadow={shadow} />
            <Face hair={hair} shadow={shadow} gender={gender} lips={lips} />
            <HairFront hairStyle={hairStyle} hair={hair} />

            <SoccerBall />
        </svg>
    );
}

export function PresetTile({ preset }) {
    if (!preset) return null;
    return <AvatarSVG p={preset} />;
}

const INITIAL_BG = [
    '#DC2E3E',
    '#2F6BE4',
    '#12A66B',
    '#F0A519',
    '#7C4DE0',
    '#14B4A6',
    '#EC5B92',
    '#F4682A',
];

function initialsFrom(name = '') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    const first = parts[0][0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
}

function hashIndex(str = '', mod = 1) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % mod;
}

export function AvatarView({ avatar, name = '', className = '', ...rest }) {
    const isData = typeof avatar === 'string' && avatar.startsWith('data:');
    const preset = typeof avatar === 'string' ? BY_ID[avatar] : null;

    return (
        <div
            className={`relative flex items-center justify-center overflow-hidden rounded-full bg-white/5 ring-2 ring-white/70 ${className}`}
            {...rest}
        >
            {isData ? (
                <img
                    src={avatar}
                    alt={name || 'Player avatar'}
                    className="h-full w-full object-cover"
                />
            ) : preset ? (
                <AvatarSVG p={preset} />
            ) : (
                <div
                    className="flex h-full w-full items-center justify-center font-bold text-white"
                    style={{
                        background: INITIAL_BG[hashIndex(name, INITIAL_BG.length)],
                        fontSize: '42%',
                        letterSpacing: '0.04em',
                    }}
                >
                    {initialsFrom(name) || '★'}
                </div>
            )}
        </div>
    );
}

export default PRESET_AVATARS;