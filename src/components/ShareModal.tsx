import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Link as LinkIcon, Copy, Check, Users as UsersIcon } from 'lucide-react';
import { getOrCreatePlanInvite, generateInviteLink } from '../hooks/useInvites';
import { useFriends } from '../hooks/useFriends';
import { addMemberToPlan } from '../hooks/useFirestore';
import type { Plan } from '../types';

interface ShareModalProps {
    plan: Plan;
    currentUserId: string;
    currentUserName: string;
    onClose: () => void;
}

export function ShareModal({ plan, currentUserId, currentUserName, onClose }: ShareModalProps) {
    const { t } = useTranslation();
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [shareMessage, setShareMessage] = useState('');

    const { friends } = useFriends(currentUserId);

    const handleGenerateLink = async () => {
        setGenerating(true);
        try {
            const code = await getOrCreatePlanInvite(plan.id, plan.name, currentUserId, currentUserName);
            const link = generateInviteLink(code);
            setInviteLink(link);
        } catch {
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareWithFriend = async (friendUid: string, friendEmail: string, friendName: string, friendPhoto?: string) => {
        try {
            await addMemberToPlan(plan.id, friendUid, friendEmail, friendName, friendPhoto);
            setShareMessage(`${friendName} ${t('plans.item_added')}`);
            setTimeout(() => setShareMessage(''), 2000);
        } catch {
        }
    };

    const isMember = (uid: string) => !!plan.members[uid];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm px-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 max-w-lg w-full shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/20">
                    <div>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white">{t('plans.share_title')}</h2>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase mt-1 italic">{plan.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 max-h-[70vh] overflow-auto">
                    {shareMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold text-center italic"
                        >
                            {shareMessage}
                        </motion.div>
                    )}

                    {/* Generate Link */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
                            {t('plans.share_invite_link')}
                        </h3>
                        {!inviteLink ? (
                            <button
                                onClick={handleGenerateLink}
                                disabled={generating}
                                className="w-full h-14 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-black font-black italic uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/10"
                            >
                                <LinkIcon className="w-5 h-5 stroke-[2.5px]" />
                                {generating ? t('plans.generating') : t('plans.generate_invite')}
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inviteLink}
                                        readOnly
                                        className="flex-1 h-14 px-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-zinc-600 dark:text-zinc-400 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className="px-6 h-14 rounded-2xl bg-emerald-500 text-black font-black italic uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                    >
                                        {copied ? <Check className="w-5 h-5 stroke-[3px]" /> : <Copy className="w-5 h-5 stroke-[2.5px]" />}
                                        {copied ? t('plans.copied') : t('plans.copy')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Share with Friends */}
                    {friends.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
                                {t('plans.share_with_friends')}
                            </h3>
                            <div className="space-y-2">
                                {friends.map((friend) => (
                                    <div
                                        key={friend.uid}
                                        className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between hover:border-emerald-500/30 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            {friend.photoURL ? (
                                                <img src={friend.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover border border-white dark:border-zinc-700" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-black text-zinc-500 dark:text-zinc-400">
                                                    {friend.displayName[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-sm text-zinc-900 dark:text-white">{friend.displayName}</div>
                                                <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">{friend.email}</div>
                                            </div>
                                        </div>

                                        {isMember(friend.uid) ? (
                                            <div className="text-[10px] font-black uppercase text-zinc-300 dark:text-zinc-600 tracking-widest">{t('plans.member')}</div>
                                        ) : (
                                            <button
                                                onClick={() => handleShareWithFriend(friend.uid, friend.email, friend.displayName, friend.photoURL)}
                                                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                            >
                                                {t('plans.invite')}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Current Members */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <UsersIcon className="w-4 h-4" />
                            {t('plans.members', { count: Object.keys(plan.members).length })}
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {Object.values(plan.members).map((member) => (
                                <div
                                    key={member.uid}
                                    className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        {member.photoURL ? (
                                            <img src={member.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover border border-white dark:border-zinc-800" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-black text-zinc-500 dark:text-zinc-500">
                                                {member.displayName[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-sm text-zinc-900 dark:text-white">{member.displayName}</div>
                                            <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">{member.email}</div>
                                        </div>
                                    </div>
                                    <div className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-widest ${member.role === 'owner' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'}`}>
                                        {member.role === 'owner' ? t('plans.owner') : t('plans.helper')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
