// TODO: not demo-ready — hidden from primary nav (AppLayout + Footer).
// Route in App.jsx still exists so any external link keeps resolving, but
// the page ships stub content (fake persona, hardcoded YouTube IDs). Bring
// it back onto the ps-* system + real data before re-linking.
import { useState } from 'react';

const VIDEO_TYPES = [
    { value: 'match',    label: 'Match',    testId: 'video-upload-type-match' },
    { value: 'training', label: 'Training', testId: 'video-upload-type-training' },
];

const SAVED_VIDEOS = {
    match: [
        { id: 'Vj6kDXmz43I', title: 'Demo Academy vs Rivals FC', meta: 'U12 League · Full match' },
        { id: 'maFA1RP1PUU', title: 'Futuro v Liverpool FC',      meta: 'U12 Cup · Full match' },
    ],
    training: [
        { id: 'Vj6kDXmz43I', title: 'Small-sided rondos',         meta: 'Session · 60 min' },
        { id: 'maFA1RP1PUU', title: 'Finishing block',            meta: 'Session · 45 min' },
    ],
};

const HEADLINE = {
    match:    'Demo Academy vs Rivals FC · U12 League Match',
    training: 'Weekday training · Small-sided rondos & finishing',
};

function YouTubeBroadcast({ videoId, videoType }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="mb-3 text-sm font-semibold">
                {videoType === 'match' ? 'Match Broadcast Feed' : 'Training Video Feed'}
            </p>
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10">
                <iframe
                    key={videoId}
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={videoType === 'match' ? 'Match Broadcast' : 'Training Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </div>
    );
}

function UploadModal({ open, onClose, onSelect, currentId, videoType }) {
    if (!open) return null;
    const label = videoType === 'match' ? 'Upload Match' : 'Upload Training';
    const description = videoType === 'match'
        ? 'Pick a saved match to load into the broadcast feed.'
        : 'Pick a saved training session to load into the feed.';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0f0c] p-6 text-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="ps-label">{label}</p>
                        <h3 className="mt-1 text-xl font-bold">Select a video</h3>
                        <p className="mt-1 text-sm text-white/50">{description}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-2xl leading-none text-white/50 hover:text-white"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="mt-6 space-y-3">
                    {SAVED_VIDEOS[videoType].map((v, i) => {
                        const isCurrent = v.id === currentId;
                        return (
                            <button
                                key={i}
                                onClick={() => onSelect(v.id)}
                                className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-green-400/60 hover:bg-white/10"
                            >
                                <div className="flex h-12 w-20 flex-none items-center justify-center rounded-md border border-white/10 bg-black/50">
                                    <span className="text-lg text-green-400">▶</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">{v.title}</p>
                                    <p className="text-xs text-white/50">{v.meta}</p>
                                </div>
                                {isCurrent && (
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-green-400">
                                        Loaded
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    <div
                        className="flex w-full cursor-not-allowed items-center gap-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 opacity-50"
                        aria-disabled="true"
                        title="Veo upload coming soon"
                    >
                        <div className="flex h-12 w-20 flex-none items-center justify-center rounded-md border border-white/10 bg-black/40">
                            <span className="text-xs font-bold text-white/40">VEO</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-white/70">Upload from Veo</p>
                            <p className="text-xs text-white/40">
                                Import a full Veo {videoType} recording
                            </p>
                        </div>
                        <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/50">
                            Coming soon
                        </span>
                    </div>
                </div>

                <p className="mt-5 text-center text-xs text-white/40">
                    Veo and direct file uploads will be supported in the full release.
                </p>
            </div>
        </div>
    );
}

function SimpleRadar({ data }) {
    const items = [
        { k: 'scanning',      label: 'Scanning' },
        { k: 'awareness',     label: 'Awareness' },
        { k: 'tempo',         label: 'Tempo' },
        { k: 'decisionSpeed', label: 'Decision' },
    ];
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold">Player Performance</h3>
            <div className="space-y-4">
                {items.map((i) => (
                    <div key={i.k}>
                        <div className="flex justify-between text-xs text-white/60">
                            <span>{i.label}</span>
                            <span className="font-bold text-green-400">
                                {data[i.k]} / 100
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-2 bg-green-400" style={{ width: `${data[i.k]}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CareerCard() {
    return (
        <div className="ps-card mt-10 flex justify-between rounded-2xl border border-white/10 bg-white/5 p-6">
            <div>
                <p className="ps-label">Career Mode Profile</p>
                <h1 className="mt-3 text-2xl font-bold uppercase">Liam Carter</h1>
                <p className="text-sm text-white/60">U12 Academy · CM · Age 11</p>
                <div className="mt-4 space-y-1 text-xs text-white/50">
                    <p>📈 Scanning improving</p>
                    <p>📈 Awareness growth trend</p>
                    <p>📉 Tempo fluctuating under pressure</p>
                </div>
            </div>
            <div className="text-right">
                <p className="ps-label">PlaySharp IQ</p>
                <div className="text-3xl font-bold text-green-400">70</div>
            </div>
        </div>
    );
}

function DevelopmentTimeline() {
    const data = [
        { match: 'M1', score: 62 },
        { match: 'M2', score: 66 },
        { match: 'M3', score: 71 },
        { match: 'M4', score: 75 },
        { match: 'M5', score: 79 },
    ];
    const width = 600;
    const height = 200;
    const max = 100;
    const min = 50;
    const points = data
        .map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((d.score - min) / (max - min)) * height;
            return `${x},${y}`;
        })
        .join(' ');
    return (
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold">Player Development Curve</h3>
            <p className="mb-6 text-xs text-white/50">
                Career Mode progression (0–100 cognitive scale)
            </p>
            <div className="overflow-x-auto">
                <svg width={width} height={height} className="w-full">
                    <line x1="0" y1={height} x2={width} y2={height} stroke="rgba(255,255,255,0.1)" />
                    <polyline fill="none" stroke="#22c55e" strokeWidth="3" points={points} />
                    {data.map((d, i) => {
                        const x = (i / (data.length - 1)) * width;
                        const y = height - ((d.score - min) / (max - min)) * height;
                        return <circle key={i} cx={x} cy={y} r="4" fill="#22c55e" />;
                    })}
                </svg>
            </div>
            <div className="mt-3 flex justify-between text-xs text-white/50">
                {data.map((d, i) => (
                    <span key={i}>{d.match}</span>
                ))}
            </div>
        </div>
    );
}

function Loader({ videoType }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white">
            <div className="text-center">
                <div className="mx-auto h-20 w-20 animate-spin rounded-full border-4 border-white/10 border-t-green-400" />
                <h2 className="mt-6 text-2xl font-bold">
                    Processing {videoType === 'match' ? 'Match' : 'Training'}
                </h2>
                <p className="mt-2 text-white/60">
                    AI building player intelligence model...
                </p>
            </div>
        </div>
    );
}

export default function VideoUploadPage() {
    const [videoType, setVideoType] = useState('match');
    const [loading, setLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [videoId, setVideoId] = useState(SAVED_VIDEOS.match[0].id);

    const handleSelectVideo = (id) => {
        setShowUpload(false);
        setLoading(true);
        setTimeout(() => {
            setVideoId(id);
            setLoading(false);
        }, 1800);
    };

    const switchType = (type) => {
        if (type === videoType) return;
        setVideoType(type);
        setVideoId(SAVED_VIDEOS[type][0].id);
    };

    return (
        <div
            data-testid="video-upload-page"
            className="mx-auto max-w-6xl px-6 py-16 text-white"
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="ps-label">AI Video Upload</p>
                    <h1 className="mt-2 text-4xl font-bold">{HEADLINE[videoType]}</h1>
                    <p
                        data-testid="video-upload-subtitle"
                        className="mt-3 max-w-xl text-base font-medium text-white/75"
                    >
                        Upload training or match videos for AI analysis.
                    </p>
                    <h2 className="mt-2 text-3xl font-bold">Liam Carter</h2>
                    <p className="mt-2 text-white/60">
                        Cognitive performance + tactical breakdown
                    </p>
                </div>

                <button
                    onClick={() => setShowUpload(true)}
                    className="ps-btn-primary"
                    data-testid="video-upload-open-upload"
                >
                    {videoType === 'match' ? 'Upload Match' : 'Upload Training'}
                </button>
            </div>

            <div
                data-testid="video-upload-type-toggle"
                className="mt-6 inline-flex items-center gap-1 rounded-sm border border-white/10 bg-white/5 p-1"
            >
                {VIDEO_TYPES.map((t) => {
                    const active = t.value === videoType;
                    return (
                        <button
                            key={t.value}
                            type="button"
                            data-testid={t.testId}
                            onClick={() => switchType(t.value)}
                            className={[
                                'px-4 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] transition-colors',
                                active
                                    ? 'bg-ps-red text-white'
                                    : 'text-white/60 hover:text-white',
                            ].join(' ')}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {loading && <Loader videoType={videoType} />}
            <UploadModal
                open={showUpload}
                onClose={() => setShowUpload(false)}
                onSelect={handleSelectVideo}
                currentId={videoId}
                videoType={videoType}
            />

            <div className="mt-10">
                <YouTubeBroadcast videoId={videoId} videoType={videoType} />
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
                <SimpleRadar
                    data={{
                        scanning: 70,
                        awareness: 75,
                        tempo: 72,
                        decisionSpeed: 70,
                    }}
                />
                <CareerCard />
            </div>

            <DevelopmentTimeline />

            <div className="mt-12 text-center">
                <button
                    type="button"
                    data-testid="video-upload-run-analysis"
                    onClick={() => setShowUpload(true)}
                    className="ps-btn-secondary"
                >
                    Run New Analysis
                </button>
            </div>
        </div>
    );
}
