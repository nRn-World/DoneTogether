import { motion } from 'framer-motion';
import { LogIn, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

interface AuthModalProps {
    onSignIn: () => void;
    onClose: () => void;
    error?: string | null;
}

export function AuthModal({ onSignIn, onClose, error }: AuthModalProps) {
    const { t } = useTranslation();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm px-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-10 relative shadow-2xl"
            >
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-10">
                    <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20 rotate-3">
                        <LogIn className="w-10 h-10 text-black stroke-[2.5px]" />
                    </div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2 text-zinc-900 dark:text-white">{t('auth.login')}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium italic mb-6">
                        {t('auth.login_subtitle')}
                    </p>

                    <div className="flex justify-center">
                        <LanguageSwitcher />
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 text-sm font-bold text-center italic">
                        {error}
                    </div>
                )}

                <button
                    onClick={async () => {
                        try {
                            await onSignIn();
                        } catch (error) {
                            console.error('Error in onSignIn:', error);
                            // Appen bör inte krascha här, men vi loggar felet
                        }
                    }}
                    className="w-full h-16 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-black font-black italic uppercase tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    {t('auth.continue_google')}
                </button>

                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase font-bold italic tracking-widest">
                        <span className="bg-white dark:bg-zinc-900 px-4 text-zinc-400">{t('common.or')}</span>
                    </div>
                </div>

                <button
                    type="button"
                    disabled
                    className="w-full h-14 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 font-black italic uppercase tracking-widest flex items-center justify-center gap-4 opacity-60 cursor-not-allowed"
                >
                    <LogIn className="w-5 h-5" />
                    {t('auth.login_email')} (snart)
                </button>
            </motion.div>
        </div>
    );
}
