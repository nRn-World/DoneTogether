import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MessageSquare, Send, X, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    getUserSendBlockReason,
    markThreadRead,
    sendAdminChatMessage,
    useAdminThreadMessages,
} from '../hooks/useAdminChat';
import { isAdminEmail } from '../lib/admin';
import type { UserProfile } from '../types';

interface ContactAdminModalProps {
    open: boolean;
    onClose: () => void;
    /** Thread owner (the regular user's uid) */
    threadUserId: string;
    /** Currently signed-in user */
    currentUser: UserProfile;
    /** Thread owner's profile fields (needed when admin replies) */
    threadUser: { email: string; displayName: string; photoURL?: string };
    mode?: 'user' | 'admin';
}

function formatTime(createdAt: { toDate?: () => Date; toMillis?: () => number } | undefined): string {
    try {
        const date =
            createdAt?.toDate?.() ?? (createdAt?.toMillis ? new Date(createdAt.toMillis()) : null);
        if (!date) return '';
        return date.toLocaleString('sv-SE', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

export function ContactAdminModal({
    open,
    onClose,
    threadUserId,
    currentUser,
    threadUser,
    mode = 'user',
}: ContactAdminModalProps) {
    const { t } = useTranslation();
    const isAdminMode = mode === 'admin' && isAdminEmail(currentUser.email);
    const { messages, loading, error } = useAdminThreadMessages(threadUserId, open);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const blockReason = isAdminMode ? null : getUserSendBlockReason(messages);

    useEffect(() => {
        if (!open) return;
        void markThreadRead(threadUserId, isAdminMode ? 'admin' : 'user');
    }, [open, threadUserId, isAdminMode, messages.length]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, open]);

    useEffect(() => {
        if (!open) {
            setText('');
            setSendError(null);
        }
    }, [open]);

    const onSend = async () => {
        const value = text.trim();
        if (!value || sending) return;
        if (!isAdminMode && blockReason) return;

        setSending(true);
        setSendError(null);
        try {
            await sendAdminChatMessage({
                threadUserId,
                sender: isAdminMode ? 'admin' : 'user',
                senderUid: currentUser.uid,
                text: value,
                threadUser: {
                    email: threadUser.email,
                    displayName: threadUser.displayName,
                    photoURL: threadUser.photoURL,
                },
            });
            setText('');
        } catch (err) {
            console.error(err);
            const code = (err as { code?: string })?.code || '';
            if (String(code).includes('permission')) {
                setSendError(t('contact.send_error_rules'));
            } else {
                setSendError(t('contact.send_error'));
            }
        } finally {
            setSending(false);
        }
    };

    const placeholder = isAdminMode
        ? t('contact.admin_placeholder')
        : blockReason === 'awaiting_reply'
          ? t('contact.wait_reply')
          : blockReason === 'daily_limit'
            ? t('contact.daily_limit')
            : t('contact.placeholder');

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <button
                        type="button"
                        aria-label="Stäng"
                        className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="contact-modal-title"
                        initial={{ opacity: 0, y: 36 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl sm:rounded-[28px]"
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                    {isAdminMode ? (
                                        <Shield className="w-5 h-5" />
                                    ) : (
                                        <MessageSquare className="w-5 h-5" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h2 id="contact-modal-title" className="text-lg font-black italic tracking-tight uppercase text-zinc-900 dark:text-white truncate">
                                        {isAdminMode
                                            ? threadUser.displayName || t('contact.admin_title')
                                            : t('contact.title')}
                                    </h2>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                                        {isAdminMode
                                            ? threadUser.email || t('contact.admin_subtitle')
                                            : t('contact.subtitle')}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label={t('common.close')} className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[240px]">
                            {loading && (
                                <div className="flex justify-center py-10 text-zinc-600 dark:text-zinc-400">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            )}
                            {error && (
                                <p className="text-center text-sm text-red-700 dark:text-red-400 py-6">{error}</p>
                            )}
                            {!loading && !error && messages.length === 0 && (
                                <div className="text-center py-12 px-4">
                                    <MessageSquare className="w-10 h-10 text-zinc-500 dark:text-zinc-400 mx-auto mb-3" />
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">{t('contact.empty')}</p>
                                </div>
                            )}
                            {messages.map((m) => {
                                const mine =
                                    (isAdminMode && m.from === 'admin') ||
                                    (!isAdminMode && m.from === 'user');
                                return (
                                    <div
                                        key={m.id}
                                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                                                mine
                                                    ? 'bg-emerald-500 text-black rounded-br-md'
                                                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-bl-md'
                                            }`}
                                        >
                                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
                                                {m.from === 'admin'
                                                    ? t('contact.role_admin')
                                                    : isAdminMode
                                                      ? t('contact.role_user')
                                                      : t('contact.role_you')}
                                            </p>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                {m.text}
                                            </p>
                                            <p
                                                className={`text-[10px] mt-1.5 ${mine ? 'text-black/50' : 'text-zinc-600 dark:text-zinc-400'}`}
                                            >
                                                {formatTime(m.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
                            {!isAdminMode && blockReason && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium px-1">
                                    {blockReason === 'awaiting_reply'
                                        ? t('contact.wait_reply_hint')
                                        : t('contact.daily_limit_hint')}
                                </p>
                            )}
                            {sendError && (
                                <p className="text-[11px] text-red-700 dark:text-red-400 px-1">{sendError}</p>
                            )}
                            <div className="flex items-end gap-2">
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value.slice(0, 1000))}
                                    rows={2}
                                    disabled={sending || (!isAdminMode && !!blockReason)}
                                    placeholder={placeholder}
                                    className="flex-1 resize-none rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            void onSend();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    aria-label={t('contact.send')} onClick={() => void onSend()}
                                    disabled={
                                        sending || !text.trim() || (!isAdminMode && !!blockReason)
                                    }
                                    className="h-12 w-12 shrink-0 rounded-2xl bg-emerald-500 text-black flex items-center justify-center disabled:opacity-40 hover:scale-105 active:scale-95 transition-all"
                                >
                                    {sending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
