import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Download,
    Loader2,
    MessageSquare,
    Radio,
    RefreshCw,
    Shield,
    Users,
    X,
    Smartphone,
    Globe,
    MonitorSmartphone,
} from 'lucide-react';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import { useAdminInbox } from '../hooks/useAdminChat';
import { ContactAdminModal } from './ContactAdminModal';
import { isAdminEmail } from '../lib/admin';
import type { ClientPlatform } from '../lib/clientPlatform';
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

function platformLabel(p: ClientPlatform | undefined): string {
    switch (p) {
        case 'android':
            return 'Android';
        case 'ios':
            return 'iOS';
        case 'pwa':
            return 'PWA';
        case 'web':
            return 'Webb';
        default:
            return '—';
    }
}

function PlatformIcon({ platform }: { platform: ClientPlatform }) {
    if (platform === 'android' || platform === 'ios') {
        return <Smartphone className="w-3.5 h-3.5" />;
    }
    if (platform === 'pwa') {
        return <MonitorSmartphone className="w-3.5 h-3.5" />;
    }
    return <Globe className="w-3.5 h-3.5" />;
}

function MetricCard({
    label,
    value,
    hint,
    icon,
    accent,
    pulse,
}: {
    label: string;
    value: number | string;
    hint: string;
    icon: ReactNode;
    accent: string;
    pulse?: boolean;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 backdrop-blur-sm">
            <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30 blur-2xl ${accent}`} />
            <div className="relative flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-white tabular-nums sm:text-4xl">
                        {value}
                    </p>
                    <p className="mt-1.5 text-xs text-zinc-400">{hint}</p>
                </div>
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-200">
                    {icon}
                    {pulse && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function PlatformBars({
    title,
    data,
}: {
    title: string;
    data: Record<ClientPlatform, number>;
}) {
    const entries = (Object.entries(data) as [ClientPlatform, number][]).filter(([, n]) => n > 0);
    const total = entries.reduce((sum, [, n]) => sum + n, 0) || 1;

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{title}</p>
            {entries.length === 0 ? (
                <p className="text-sm text-zinc-400">Ingen data ännu</p>
            ) : (
                <div className="space-y-3">
                    {entries.map(([platform, count]) => (
                        <div key={platform}>
                            <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-300">
                                <span className="inline-flex items-center gap-1.5">
                                    <PlatformIcon platform={platform} />
                                    {platformLabel(platform)}
                                </span>
                                <span className="tabular-nums text-zinc-400">{count}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(count / total) * 100}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function AdminDashboard({ open, onClose, email, currentUser }: AdminDashboardProps) {
    const [tab, setTab] = useState<'insights' | 'inbox'>('insights');
    const [activeThread, setActiveThread] = useState<(AdminThread & { id: string }) | null>(null);
    const isAdmin = isAdminEmail(email);
    const { metrics, loading, error, refresh } = useAdminMetrics(open && tab === 'insights' && isAdmin, email);
    const { threads, loading: inboxLoading, error: inboxError, unreadCount } = useAdminInbox(email, open && isAdmin);

    useEffect(() => {
        if (!open) {
            setActiveThread(null);
            setTab('insights');
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
                                            Adminpanel
                                        </h2>
                                        <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                                            Statistik och meddelanden från användare
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {tab === 'insights' && (
                                        <button
                                            type="button"
                                            onClick={() => void refresh()}
                                            disabled={loading}
                                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
                                            title="Uppdatera"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        aria-label="Stäng" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="relative mt-4 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTab('insights')}
                                    className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                                        tab === 'insights'
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    Insikter
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTab('inbox')}
                                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                                        tab === 'inbox'
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    Meddelanden
                                    {unreadCount > 0 && (
                                        <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                            {tab === 'insights' && (
                                <>
                                    {error && (
                                        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                            {error}
                                        </div>
                                    )}

                                    {loading && !metrics ? (
                                        <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-400">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                                            <p className="text-sm">Hämtar live-statistik…</p>
                                        </div>
                                    ) : metrics ? (
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                <MetricCard
                                                    label="Totalt"
                                                    value={metrics.totalUsers}
                                                    hint="Registrerade konton"
                                                    icon={<Users className="h-4 w-4" />}
                                                    accent="bg-emerald-500"
                                                />
                                                <MetricCard
                                                    label="Online"
                                                    value={metrics.onlineNow}
                                                    hint="Aktiva senaste 5 min"
                                                    icon={<Radio className="h-4 w-4" />}
                                                    accent="bg-teal-400"
                                                    pulse={metrics.onlineNow > 0}
                                                />
                                                <MetricCard
                                                    label="24 timmar"
                                                    value={metrics.active24h}
                                                    hint="Aktiva senaste dygnet"
                                                    icon={<Activity className="h-4 w-4" />}
                                                    accent="bg-sky-500"
                                                />
                                                <MetricCard
                                                    label="Installs"
                                                    value={metrics.installs}
                                                    hint="Unika enheter / browsrar"
                                                    icon={<Download className="h-4 w-4" />}
                                                    accent="bg-amber-500"
                                                />
                                            </div>

                                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5">
                                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                                                    <span>
                                                        Aktiva senaste 7 dagarna:{' '}
                                                        <span className="font-semibold text-zinc-200 tabular-nums">
                                                            {metrics.active7d}
                                                        </span>
                                                    </span>
                                                    <span className="tabular-nums">
                                                        Uppdaterad{' '}
                                                        {new Date(metrics.fetchedAt).toLocaleTimeString('sv-SE', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            second: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <PlatformBars title="Användare per plattform" data={metrics.byPlatform} />
                                                <PlatformBars title="Installs per plattform" data={metrics.installsByPlatform} />
                                            </div>

                                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                                                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                                                    Senast aktiva
                                                </p>
                                                <div className="space-y-2">
                                                    {metrics.recentUsers.length === 0 ? (
                                                        <p className="text-sm text-zinc-400">Inga användare ännu</p>
                                                    ) : (
                                                        metrics.recentUsers.map((u) => (
                                                            <div
                                                                key={u.uid}
                                                                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-black/20 px-3 py-2.5"
                                                            >
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-medium text-zinc-100">
                                                                        {u.displayName}
                                                                    </p>
                                                                    <p className="truncate text-[11px] text-zinc-400">{u.email}</p>
                                                                </div>
                                                                <div className="shrink-0 text-right">
                                                                    <p className="text-[11px] font-medium text-zinc-300">
                                                                        {formatRelative(u.lastActiveAt)}
                                                                    </p>
                                                                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400">
                                                                        <PlatformIcon platform={u.clientPlatform || 'web'} />
                                                                        {platformLabel(u.clientPlatform)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </>
                            )}

                            {tab === 'inbox' && (
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
