import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Pricing from "@/pages/Pricing";
import Contact from "@/pages/Contact";
import VideoUploadPage from "@/pages/VideoUpload";
import LeaderboardPage from "@/pages/LeaderboardPage";
import AppLayout from "@/components/AppLayout";
import ProfileGate from "@/components/ProfileGate";
import Profile from "@/pages/Profile";
import Schedule from "@/pages/Schedule";
import Objectives from "@/pages/Objectives";
import IQTraining from "@/pages/IQTraining";
import PlaySharpDNA from "@/pages/PlaySharpDNA";
import TacticsQuiz from "@/pages/TacticsQuiz";
import React, { Suspense, lazy } from 'react';
import OrientationGate from '@/elite/ui/OrientationGate.jsx';

// lazy-loaded elite scenes (route-split)
const DecisionGame3D = lazy(() => import('@/elite/games/DecisionGame3D.jsx'));
const PressingGame3D = lazy(() => import('@/elite/games/PressingGame3D.jsx'));
const MovementGame3D = lazy(() => import('@/elite/games/MovementGame3D.jsx'));
const BodyShapeGame3D = lazy(() => import('@/elite/games/BodyShapeGame3D.jsx'));
const StrikerGame3D = lazy(() => import('@/elite/games/StrikerGame3D.jsx'));
const ScanningGame3D = lazy(() => import('@/elite/games/ScanningGame3D.jsx'));

// Elite games are landscape-designed. On phones held in portrait we ask
// the user to rotate the device.
const eliteRoute = (Component) => (
  <OrientationGate>
    <Suspense fallback={<div/>}>{Component}</Suspense>
  </OrientationGate>
);

function App() {
    return (
        <div className="App min-h-screen bg-ps-bg text-white" data-testid="app-root">
            <BrowserRouter>
                <Navbar />
                <main className="min-h-[calc(100vh-160px)]">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/pricing" element={<Pricing />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/demo" element={<Navigate to="/iq-training" replace />} />
                        <Route path="/match-report" element={<Navigate to="/video-upload" replace />} />
                        <Route path="/games/reaction" element={<Navigate to="/iq-training" replace />} />
                        <Route path="/games/decision" element={<Navigate to="/iq-training" replace />} />
                        <Route path="/games/scanning" element={<Navigate to="/iq-training" replace />} />

                        {/* Single-player app hub */}
                        <Route element={<AppLayout />}>
                            <Route path="/profile" element={<Profile />} />
                            {/* Everything below requires a completed profile */}
                            <Route element={<ProfileGate />}>
                                <Route path="/dna" element={<PlaySharpDNA />} />
                                <Route path="/schedule" element={<Schedule />} />
                                <Route path="/objectives" element={<Objectives />} />
                                <Route path="/iq-training" element={<IQTraining />} />
                                <Route path="/tactics-quiz" element={<TacticsQuiz />} />
                                <Route path="/video-upload" element={<VideoUploadPage />} />
                                <Route path="/leaderboard" element={<LeaderboardPage />} />
                            </Route>
                        </Route>

                        {/* Elite 3D routes (lazy loaded, wrapped in landscape gate) */}
                        <Route path="/elite/games/decision"   element={eliteRoute(<DecisionGame3D />)} />
                        <Route path="/elite/games/pressing"   element={eliteRoute(<PressingGame3D />)} />
                        <Route path="/elite/games/movement"   element={eliteRoute(<MovementGame3D />)} />
                        <Route path="/elite/games/body-shape" element={eliteRoute(<BodyShapeGame3D />)} />
                        <Route path="/elite/games/striker"    element={eliteRoute(<StrikerGame3D />)} />
                        <Route path="/elite/games/scanning"   element={eliteRoute(<ScanningGame3D />)} />
                    </Routes>
                </main>
                <Footer />
                <Toaster theme="dark" position="bottom-right" />
            </BrowserRouter>
        </div>
    );
}

export default App;
