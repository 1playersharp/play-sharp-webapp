import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Pricing from "@/pages/Pricing";
import Contact from "@/pages/Contact";
import Demo from "@/pages/Demo";
import MatchReportPage from "@/pages/MatchReport";  
import LeaderboardPage from "@/pages/LeaderboardPage";
import ReactionGamePage from "@/pages/ReactionGamePage";
import DecisionGamePage from "@/pages/DecisionGamePage";
import ScanningGamePage from "@/pages/ScanningGamePage";
import React, { Suspense, lazy } from 'react';

// lazy-loaded elite scenes (route-split)
const DecisionGame3D = lazy(() => import('@/elite/games/DecisionGame3D.jsx'));
const PressingGame3D = lazy(() => import('@/elite/games/PressingGame3D.jsx'));
const MovementGame3D = lazy(() => import('@/elite/games/MovementGame3D.jsx'));
const BodyShapeGame3D = lazy(() => import('@/elite/games/BodyShapeGame3D.jsx'));
const StrikerGame3D = lazy(() => import('@/elite/games/StrikerGame3D.jsx'));

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
                        <Route path="/demo" element={<Demo />} />
                        <Route path="/match-report" element={<MatchReportPage />} />
                        <Route path="/leaderboard" element={<LeaderboardPage />} />
                        <Route path="/games/reaction" element={<ReactionGamePage />} />
                        <Route path="/games/decision" element={<DecisionGamePage />} />
                        <Route path="/games/scanning" element={<ScanningGamePage />} />
                        {/* Elite 3D routes (lazy loaded) */}
                        <Route path="/elite/games/decision" element={<Suspense fallback={<div/>}><DecisionGame3D /></Suspense>} />
                        <Route path="/elite/games/pressing" element={<Suspense fallback={<div/>}><PressingGame3D /></Suspense>} />
                        <Route path="/elite/games/movement" element={<Suspense fallback={<div/>}><MovementGame3D /></Suspense>} />
                        <Route path="/elite/games/body-shape" element={<Suspense fallback={<div/>}><BodyShapeGame3D /></Suspense>} />
                        <Route path="/elite/games/striker" element={<Suspense fallback={<div/>}><StrikerGame3D /></Suspense>} />
                    </Routes>
                </main>
                <Footer />
                <Toaster theme="dark" position="bottom-right" />
            </BrowserRouter>
        </div>
    );
}

export default App;
