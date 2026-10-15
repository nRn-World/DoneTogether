import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MessageSquare, Shield, X } from 'lucide-react';
import { useAdminInbox } from '../hooks/useAdminChat';
import { ContactAdminModal } from './ContactAdminModal';
import { isAdminEmail } from '../lib/admin';
import type { UserProfile } from '../types';
import type { AdminThread } from '../types/adminChat';

interface AdminDashboardProps {
    open: boolean;
    onClose: () => void;
    email: string | null | undefined;
    currentUser: UserProfile;
}

function formatRelative(ms: number | null): string {
    if (ms == null) return 'Aldrig sett';
    const age = Date.now() - ms;
    if (age < 60_000) return 'Just nu';
    if (age < 3_600_000) return `${Math.floor(age / 60_000)} min sedan`;
    if (age < 86_400_000) return `${Math.floor(age / 3_600_000)} tim sedan`;
    return `${Math.floor(age / 86_400_000)} d sedan`;
}

export function AdminDashboard({ open, onClose, email, currentUser }: AdminDashboardProps) {
    const [activeThread, setActiveThread] = useState<(AdminThread & { id: string }) | null>(null);
    const isAdmin = isAdminEmail(email);
    const { threads, loading: inboxLoading, error: inboxError } = useAdminInbox(email, open && isAdmin);

    useEffect(() => {
        if (!open) {
            setActiveThread(null);
            return;
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !activeThread) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose, activeThread]);

    if (!isAdmin) return null;

    return (
        <>
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <button
                        type="button"
                        aria-label="Stäng"
                        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-dashboard-title"
                        initial={{ opacity: 0, y: 40, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.98 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0b0f14] shadow-2xl shadow-black/50 sm:rounded-[28px]"
                    >
                        <div className="relative border-b border-white/10 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.18),_transparent_55%)]" />
                            <div className="relative flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400/90">
                                            Admin privat
                                        </p>
                                        <h2
                                            id="admin-dashboard-title"
                                            className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl"
                                        >
                                            Meddelanden
                                        </h2>
                                        <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                                            Meddelanden från användare
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        aria-label="Stäng" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                            {(
                                <div className="space-y-3">
                                    {inboxError && (
                                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                            {inboxError}
                                        </div>
                                    )}
                                    {inboxLoading && threads.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                                            <p className="text-sm">Hämtar meddelanden…</p>
                                        </div>
                                    ) : threads.length === 0 ? (
                                        <div className="text-center py-16">
                                            <MessageSquare className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                                            <p className="text-sm text-zinc-400">Inga meddelanden ännu</p>
                                        </div>
                                    ) : (
                                        threads.map((thread) => (
                                            <button
                                                key={thread.id}
                                                type="button"
                                                onClick={() => setActiveThread(thread)}
                                                className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 hover:bg-white/[0.06] transition"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="truncate text-sm font-semibold text-zinc-100">
                                                                {thread.userName || 'Användare'}
                                                            </p>
                                                            {(thread.unreadByAdmin || thread.awaitingAdminReply) && (
                                                                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="truncate text-[11px] text-zinc-400 mt-0.5">
                                                            {thread.userEmail}
                                                        </p>
                                                        <p className="truncate text-xs text-zinc-400 mt-2">
                                                            {thread.lastMessage}
                                                        </p>
                                                    </div>
                                                    <p className="shrink-0 text-[10px] text-zinc-400 tabular-nums">
                                                        {formatRelative(
                                                            thread.lastMessageAt?.toMillis?.() ?? null
                                                        )}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {activeThread && (
            <ContactAdminModal
                open={!!activeThread}
                onClose={() => setActiveThread(null)}
                threadUserId={activeThread.userId || activeThread.id}
                currentUser={currentUser}
                threadUser={{
                    email: activeThread.userEmail,
                    displayName: activeThread.userName,
                    photoURL: activeThread.userPhoto,
                }}
                mode="admin"
            />
        )}
        </>
    );
}
