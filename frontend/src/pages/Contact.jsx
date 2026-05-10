import { useState } from "react";
import { submitContact } from "@/services/api";
import { toast } from "sonner";
import { Mail, MapPin, Send, Loader2 } from "lucide-react";

const initial = { name: "", email: "", club: "", message: "" };

export default function Contact() {
    const [form, setForm] = useState(initial);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.message) {
            toast.error("Please complete name, email, and message.");
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),
                message: form.message.trim(),
                ...(form.club.trim() ? { club: form.club.trim() } : {}),
            };
            await submitContact(payload);
            toast.success("Message received — we'll be in touch shortly.");
            setForm(initial);
            setSubmitted(true);
        } catch (err) {
            const detail =
                err?.response?.data?.detail ||
                "Something went wrong. Please try again.";
            toast.error(typeof detail === "string" ? detail : "Submission failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div data-testid="contact-page">
            <section className="border-b border-white/10">
                <div className="mx-auto max-w-7xl px-6 py-20">
                    <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
                        <div className="lg:col-span-5">
                            <p className="ps-label">Talk to us</p>
                            <h1 className="ps-section-title mt-3 text-5xl text-white md:text-6xl">
                                Bring PlaySharp to your team.
                            </h1>
                            <p className="mt-4 text-base text-white/60">
                                Club enquiries, school pilots, parent
                                questions, partnership requests — drop us a
                                note. We typically respond within one working
                                day.
                            </p>

                            <div className="mt-10 grid gap-4">
                                <div className="ps-card flex items-start gap-4 p-5">
                                    <div className="grid h-9 w-9 place-items-center border border-white/10 bg-ps-red/10">
                                        <Mail size={15} className="text-ps-red" />
                                    </div>
                                    <div>
                                        <p className="ps-label">Email</p>
                                        <p className="mt-1 font-body text-sm text-white/80">
                                            1player.sharp@gmail.com
                                        </p>
                                    </div>
                                </div>
                                <div className="ps-card flex items-start gap-4 p-5">
                                    <div className="grid h-9 w-9 place-items-center border border-white/10 bg-ps-turf/10">
                                        <MapPin size={15} className="text-ps-turf" />
                                    </div>
                                    <div>
                                        <p className="ps-label">Based in</p>
                                        <p className="mt-1 font-body text-sm text-white/80">
                                            South London · United Kingdom
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-7">
                            <form
                                data-testid="contact-form"
                                onSubmit={handleSubmit}
                                className="ps-card relative p-8 md:p-10"
                            >
                                <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                                    <div className="md:col-span-1">
                                        <label className="ps-label" htmlFor="contact-name">
                                            Name <span className="text-ps-defender">*</span>
                                        </label>
                                        <input
                                            id="contact-name"
                                            data-testid="contact-input-name"
                                            className="ps-input mt-2"
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => update("name", e.target.value)}
                                            placeholder="Your full name"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="ps-label" htmlFor="contact-email">
                                            Email <span className="text-ps-defender">*</span>
                                        </label>
                                        <input
                                            id="contact-email"
                                            data-testid="contact-input-email"
                                            className="ps-input mt-2"
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => update("email", e.target.value)}
                                            placeholder="you@club.com"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="ps-label" htmlFor="contact-club">
                                            Club / School (optional)
                                        </label>
                                        <input
                                            id="contact-club"
                                            data-testid="contact-input-club"
                                            className="ps-input mt-2"
                                            type="text"
                                            value={form.club}
                                            onChange={(e) => update("club", e.target.value)}
                                            placeholder="e.g. South London FC"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="ps-label" htmlFor="contact-message">
                                            Message <span className="text-ps-defender">*</span>
                                        </label>
                                        <textarea
                                            id="contact-message"
                                            data-testid="contact-input-message"
                                            className="ps-input mt-2 resize-none"
                                            rows={5}
                                            value={form.message}
                                            onChange={(e) => update("message", e.target.value)}
                                            placeholder="Tell us about your team and what you're looking for…"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between">
                                    <p className="text-xs text-white/40">
                                        We respect your inbox. No spam.
                                    </p>
                                    <button
                                        data-testid="contact-submit-button"
                                        type="submit"
                                        disabled={submitting}
                                        className="ps-btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2
                                                    size={14}
                                                    className="animate-spin"
                                                />
                                                Sending…
                                            </>
                                        ) : (
                                            <>
                                                Send Message <Send size={14} />
                                            </>
                                        )}
                                    </button>
                                </div>

                                {submitted && (
                                    <p
                                        data-testid="contact-submitted"
                                        className="mt-6 border-l-2 border-ps-turf bg-ps-turf/5 px-4 py-3 text-sm text-ps-turf"
                                    >
                                        Thanks — your message has been logged. A team
                                        member will be in touch.
                                    </p>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
