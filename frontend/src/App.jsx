import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Pricing from "@/pages/Pricing";
import Contact from "@/pages/Contact";
import Demo from "@/pages/Demo";
import LeaderboardPage from "@/pages/LeaderboardPage";
import ReactionGamePage from "@/pages/ReactionGamePage";
import DecisionGamePage from "@/pages/DecisionGamePage";
import ScanningGamePage from "@/pages/ScanningGamePage";

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
                        <Route path="/leaderboard" element={<LeaderboardPage />} />
                        <Route path="/games/reaction" element={<ReactionGamePage />} />
                        <Route path="/games/decision" element={<DecisionGamePage />} />
                        <Route path="/games/scanning" element={<ScanningGamePage />} />
                    </Routes>
                </main>
                <Footer />
                <Toaster theme="dark" position="bottom-right" />
            </BrowserRouter>
        </div>
    );
}

export default App;
