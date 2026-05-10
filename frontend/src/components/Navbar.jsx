import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
    { to: "/", label: "Home" },
    { to: "/demo", label: "Demo" },
    { to: "/leaderboard", label: "Leaderboard" },
    { to: "/pricing", label: "Pricing" },
    { to: "/contact", label: "Contact" },
];

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <header
            data-testid="site-navbar"
            className="sticky top-0 z-40 border-b border-white/10 bg-ps-bg/85 backdrop-blur supports-[backdrop-filter]:bg-ps-bg/65"
        >
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
                <Link
                    to="/"
                    data-testid="brand-link"
                    className="flex items-center gap-2"
                >
                    <span className="grid h-8 w-8 place-items-center border border-ps-red bg-ps-red">
                        <span className="block h-2.5 w-2.5 rotate-45 bg-white" />
                    </span>
                    <span className="font-display text-2xl font-black uppercase tracking-tight text-white">
                        Play<span className="text-ps-red">Sharp</span>
                    </span>
                </Link>

                <nav className="hidden items-center gap-1 md:flex">
                    {links.map((l) => (
                        <NavLink
                            key={l.to}
                            to={l.to}
                            end={l.to === "/"}
                            data-testid={`nav-${l.label.toLowerCase()}`}
                            className={({ isActive }) =>
                                [
                                    "font-heading text-sm font-semibold uppercase tracking-[0.16em] px-4 py-2 transition-colors",
                                    isActive
                                        ? "text-white"
                                        : "text-white/55 hover:text-white",
                                ].join(" ")
                            }
                        >
                            {l.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="hidden md:block">
                    <button
                        data-testid="navbar-cta-start-demo"
                        onClick={() => navigate("/demo")}
                        className="ps-btn-primary text-xs"
                    >
                        Start Demo
                    </button>
                </div>

                <button
                    data-testid="navbar-mobile-toggle"
                    className="md:hidden text-white"
                    onClick={() => setOpen((o) => !o)}
                    aria-label="Open menu"
                >
                    {open ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {open && (
                <div className="border-t border-white/10 bg-ps-bg md:hidden">
                    <div className="mx-auto flex max-w-7xl flex-col px-6 py-4">
                        {links.map((l) => (
                            <NavLink
                                key={l.to}
                                to={l.to}
                                end={l.to === "/"}
                                data-testid={`nav-mobile-${l.label.toLowerCase()}`}
                                onClick={() => setOpen(false)}
                                className={({ isActive }) =>
                                    [
                                        "font-heading text-base font-semibold uppercase tracking-[0.16em] py-3 border-b border-white/5",
                                        isActive
                                            ? "text-white"
                                            : "text-white/60",
                                    ].join(" ")
                                }
                            >
                                {l.label}
                            </NavLink>
                        ))}
                        <button
                            data-testid="navbar-mobile-cta"
                            onClick={() => {
                                setOpen(false);
                                navigate("/demo");
                            }}
                            className="ps-btn-primary mt-4"
                        >
                            Start Demo
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
