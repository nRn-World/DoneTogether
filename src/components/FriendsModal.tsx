import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, XCircle, Users as UsersIcon, Loader } from 'lucide-react';
import { useFriends, useFriendRequests, searchUserByEmail, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } from '../hooks/useFriends';
import type { UserProfile } from '../types';

interface FriendsModalProps {
    onClose: () => void;
    currentUser: UserProfile;
}

export function FriendsModal({ onClose, currentUser }: FriendsModalProps) {
    const { t } = useTranslation();
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResult, setSearchResult] = useState<UserProfile | null>(null);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [lastSearchTime, setLastSearchTime] = useState(0);

    const { friends, loading: friendsLoading } = useFriends(currentUser.uid);
    const { incomingRequests, outgoingRequests } = useFriendRequests(currentUser.uid);

    const handleSearch = async () => {
        if (!searchEmail.trim()) return;

        const now = Date.now();
        if (now - lastSearchTime < 2000) {
            setSearchError(t('friends.search_error'));
            return;
        }
        setLastSearchTime(now);

        setSearching(true);
        setSearchError('');
        setSearchResult(null);

        try {
            const user = await searchUserByEmail(searchEmail.trim());
            if (!user) {
                setSearchError(t('friends.not_found'));
            } else if (user.uid === currentUser.uid) {
                setSearchError(t('friends.add_self_error'));
            } else {
                setSearchResult(user);
            }
        } catch {
            setSearchError(t('friends.search_error'));
        } finally {
            setSearching(false);
        }
    };

    const handleSendRequest = async (toUser: UserProfile) => {
        try {
            await sendFriendRequest(currentUser, toUser);
            setActionMessage(t('friends.request_sent'));
            setSearchResult(null);
            setSearchEmail('');
            setTimeout(() => setActionMessage(''), 2000);
        } catch (error: any) {
            setSearchError(error.message);
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        try {
            await acceptFriendRequest(requestId);
            setActionMessage(t('friends.request_accepted'));
            setTimeout(() => setActionMessage(''), 2000);
        } catch (error: any) {
            console.error('Error accepting request:', error);
        }
    };

    const handleDeclineRequest = async (requestId: string) => {
        try {
            await declineFriendRequest(requestId);
            setActionMessage(t('friends.request_declined'));
            setTimeout(() => setActionMessage(''), 2000);
        } catch (error: any) {
            console.error('Error declining request:', error);
        }
    };

    const handleRemoveFriend = async (friendId: string) => {
        if (!confirm(t('friends.remove_confirm'))) return;

        try {
            await removeFriend(currentUser.uid, friendId);
            setActionMessage(t('friends.friend_removed'));
            setTimeout(() => setActionMessage(''), 2000);
        } catch (error: any) {
            console.error('Error removing friend:', error);
        }
    };

    const isAlreadyFriend = (uid: string) => friends.some((f) => f.uid === uid);
    const hasPendingRequest = (uid: string) =>
        outgoingRequests.some((r) => r.to === uid) ||
        incomingRequests.some((r) => r.from === uid);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm px-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-zinc-900 rounded-[40px] border border-zinc-200 dark:border-zinc-800 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 rotate-3">
                            <UsersIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white">{t('friends.title')}</h2>
                            <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest italic">{t('friends.subtitle')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Action Message */}
                <AnimatePresence>
                    {actionMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mx-8 mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold text-center italic"
                        >
                            {actionMessage}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8 space-y-8">
                    {/* Search Section */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
                            {t('friends.add_new')}
                        </h3>
                        <div className="flex gap-3">
                            <div className="flex-1 relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 dark:text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="email"
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder={t('friends.search_placeholder')}
                                    className="w-full h-14 pl-14 pr-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-bold italic text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 shadow-inner"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={searching || !searchEmail.trim()}
                                className="px-8 h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black italic uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 transition-all flex items-center gap-3 shadow-xl shadow-black/10"
                            >
                                {searching ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5 stroke-[3px]" />}
                                {t('friends.search_btn')}
                            </button>
                        </div>

                        {searchError && (
                            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 text-sm font-bold text-center italic">
                                {searchError}
                            </div>
                        )}

                        {searchResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between hover:border-emerald-500/30 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    {searchResult.photoURL ? (
                                        <img src={searchResult.photoURL} alt="" className="w-12 h-12 rounded-2xl object-cover border border-white dark:border-zinc-700 shadow-sm" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xl font-black text-zinc-500 dark:text-zinc-400">
                                            {searchResult.displayName[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-black italic text-zinc-900 dark:text-white">{searchResult.displayName}</div>
                                        <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">{searchResult.email}</div>
                                    </div>
                                </div>

                                {isAlreadyFriend(searchResult.uid) ? (
                                    <div className="text-[10px] font-black uppercase text-zinc-300 dark:text-zinc-600 tracking-widest bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg">{t('friends.already_friends')}</div>
                                ) : hasPendingRequest(searchResult.uid) ? (
                                    <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-lg">{t('friends.pending')}</div>
                                ) : (
                                    <button
                                        onClick={() => handleSendRequest(searchResult)}
                                        className="px-6 py-3 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        {t('friends.remove').replace('Ta bort', 'Lägg till').replace('Remove', 'Add').replace('Kaldır', 'Ekle')}
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Incoming Requests */}
                    {incomingRequests.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
                                {t('friends.incoming_requests', { count: incomingRequests.length })}
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {incomingRequests.map((request) => (
                                    <motion.div
                                        key={request.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            {request.fromPhoto ? (
                                                <img src={request.fromPhoto} alt="" className="w-12 h-12 rounded-2xl object-cover border border-white dark:border-zinc-800 shadow-sm" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-xl font-black text-emerald-600">
                                                    {request.fromName[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-black italic text-zinc-900 dark:text-white uppercase tracking-tight">{request.fromName}</div>
                                                <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">{request.fromEmail}</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAcceptRequest(request.id)}
                                                className="p-3 rounded-xl bg-emerald-500 text-black hover:scale-110 active:scale-90 transition-all shadow-lg shadow-emerald-500/20"
                                                title={t('friends.accept')}
                                            >
                                                <Check className="w-5 h-5 stroke-[3px]" />
                                            </button>
                                            <button
                                                onClick={() => handleDeclineRequest(request.id)}
                                                className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 hover:border-red-500/30 transition-all shadow-sm"
                                                title={t('friends.decline')}
                                            >
                                                <XCircle className="w-5 h-5 stroke-[2.5px]" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Friends List */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1">
                            {t('friends.my_friends', { count: friends.length })}
                        </h3>
                        {friendsLoading ? (
                            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-950 rounded-[32px] border-2 border-dashed border-zinc-100 dark:border-zinc-900 italic font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest text-[10px]">{t('friends.loading')}</div>
                        ) : friends.length === 0 ? (
                            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-950 rounded-[32px] border-2 border-dashed border-zinc-100 dark:border-zinc-900 font-black italic text-zinc-400 dark:text-zinc-600 uppercase tracking-widest text-[10px] px-8">
                                {t('friends.no_friends')}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {friends.map((friend) => (
                                    <div
                                        key={friend.uid}
                                        className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            {friend.photoURL ? (
                                                <img src={friend.photoURL} alt="" className="w-12 h-12 rounded-2xl object-cover border border-white dark:border-zinc-800 shadow-sm transition-transform group-hover:scale-110" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xl font-black text-zinc-500 dark:text-zinc-500">
                                                    {friend.displayName[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-black italic text-zinc-900 dark:text-white uppercase tracking-tight">{friend.displayName}</div>
                                                <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">{friend.email}</div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRemoveFriend(friend.uid)}
                                            className="opacity-0 group-hover:opacity-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all"
                                        >
                                            {t('friends.remove')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
