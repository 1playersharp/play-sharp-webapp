import { useState } from "react";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import { submitClubClaim } from "@/services/api";
import { toast } from "sonner";

const ROLES = ["Head Coach", "Assistant Coach", "Club Director", "School Staff", "Academy Staff", "Parent", "Other"];

/**
 * ClubClaimModal — appears after a demo run when the user entered a club we
 * haven't seen before. Captures coach email + role + squad size to convert
 * arbitrary club entries into qualified B2B leads.
 */
export default function ClubClaimModal({ open, club, playerName, onClose }) {
    const [form, setForm] = useState({
        contactName: playerName || "",
        email: "",
        role: ROLES[0],
        squadSize: "",
        message: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    if (!open) return null;

    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.contactName.trim() || !form.email.trim()) {
            toast.error("Please fill in your name and email.");
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                club,
                contactName: form.contactName.trim(),
                email: form.email.trim(),
                role: form.role,
                ...(form.squadSize ? { squadSize: Number(form.squadSize) } : {}),
                ...(form.message.trim() ? { message: form.message.trim() } : {}),
            };
            await submitClubClaim(payload);
            setSubmitted(true);
            toast.success("Got it — a pilot proposal is on its way.");
        } catch (err) {
            const detail = err?.response?.data?.detail;
            toast.error(typeof detail === "string" ? detail : "Couldn't submit. Try again?");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            data-testid="club-claim-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-xl overflow-hidden bg-ps-bg"
                onClick={(e) => e.stopPropagation()}
                style={{ borderRadius: 2 }}
            >
                {/* Red top strip */}
                <div className="flex items-center justify-between bg-ps-red px-6 py-3">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-white" />
                        <span className="font-display text-xs font-black uppercase tracking-[0.22em] text-white">
                            New Club Detected
                        </span>
                    </div>
                    <button
                        data-testid="club-claim-close"
                        type="button"
                        onClick={onClose}
                        className="text-white/80 transition-colors hover:text-white"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {submitted ? (
                    <div className="p-8 text-center" data-testid="club-claim-success">
                        <div className="mx-auto grid h-12 w-12 place-items-center border border-ps-turf/40 bg-ps-turf/10 text-ps-turf">
                            <Send size={18} />
                        </div>
                        <h3 className="mt-4 font-display text-2xl font-black uppercase text-white">
                            Thanks, {form.contactName.split(" ")[0]}.
                        </h3>
                        <p className="mt-3 text-sm text-white/65">
                            We'll be in touch within one working day with a
                            tailored pilot proposal for <strong className="text-white">{club}</strong>.
                        </p>
                        <button
                            data-testid="club-claim-success-close"
                            type="button"
                            onClick={onClose}
                            className="ps-btn-secondary mt-6"
                        >
                            Back to Leaderboard
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-8">
                        <h3 className="font-display text-2xl font-black uppercase leading-tight text-white md:text-3xl">
                            Want PlaySharp for the rest of{" "}
                            <span className="text-ps-red">{club}</span>?
                        </h3>
                        <p className="mt-2 text-sm text-white/60">
                            We'll set up a free 2-week pilot for your squad —
                            drills, leaderboards, and a coach dashboard. No
                            credit card needed.
                        </p>

                        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="ps-label" htmlFor="cc-name">
                                    Your name *
                                </label>
                                <input
                                    id="cc-name"
                                    data-testid="club-claim-input-name"
                                    className="ps-input mt-2"
                                    type="text"
                                    value={form.contactName}
                                    onChange={(e) => update("contactName", e.target.value)}
                                    placeholder="Full name"
                                    required
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="ps-label" htmlFor="cc-email">
                                    Work email *
                                </label>
                                <input
                                    id="cc-email"
                                    data-testid="club-claim-input-email"
                                    className="ps-input mt-2"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => update("email", e.target.value)}
                                    placeholder="coach@yourclub.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="ps-label" htmlFor="cc-role">
                                    Your role
                                </label>
                                <select
                                    id="cc-role"
                                    data-testid="club-claim-input-role"
                                    className="ps-input mt-2 appearance-none"
                                    value={form.role}
                                    onChange={(e) => update("role", e.target.value)}
                                >
                                    {ROLES.map((r) => (
                                        <option key={r} value={r} className="bg-ps-surface">
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="ps-label" htmlFor="cc-squad">
                                    Squad size (optional)
                                </label>
                                <input
                                    id="cc-squad"
                                    data-testid="club-claim-input-squad"
                                    className="ps-input mt-2"
                                    type="number"
                                    min="1"
                                    max="2000"
                                    value={form.squadSize}
                                    onChange={(e) => update("squadSize", e.target.value)}
                                    placeholder="e.g. 24"
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-between gap-3">
                            <button
                                data-testid="club-claim-dismiss"
                                type="button"
                                onClick={onClose}
                                className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/45 hover:text-white"
                            >
                                No thanks
                            </button>
                            <button
                                data-testid="club-claim-submit"
                                type="submit"
                                disabled={submitting}
                                className="ps-btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> Sending…
                                    </>
                                ) : (
                                    <>
                                        Request Pilot <Send size={14} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
