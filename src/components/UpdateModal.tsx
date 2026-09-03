import { motion } from 'framer-motion';
import { Download, X, Sparkles, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AppUpdateInfo } from '../lib/appUpdate';

interface UpdateModalProps {
  update: AppUpdateInfo;
  onUpdate: () => void;
  onLater: () => void;
  downloading?: boolean;
  downloadError?: string | null;
}

export function UpdateModal({
  update,
  onUpdate,
  onLater,
  downloading = false,
  downloadError = null
}: UpdateModalProps) {
  const { t } = useTranslation();
  const notes = update.releaseNotes
    ? update.releaseNotes.slice(0, 280)
    : null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm px-4 pb-6 sm:pb-0">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl relative"
      >
        <button
          type="button"
          onClick={onLater}
          disabled={downloading}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition disabled:opacity-40"
          aria-label={t('common.cancel')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-6 h-6 text-black" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              {t('update.badge')}
            </p>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white">
              {t('update.title')}
            </h2>
          </div>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3">
          {t('update.description', {
            latest: update.latestVersion,
            current: update.currentVersion
          })}
        </p>

        {notes && (
          <div className="mb-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
              {t('update.notes_label')}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {notes}
            </p>
          </div>
        )}

        {downloadError === 'permission' && (
          <p className="mb-3 text-xs text-amber-600 dark:text-amber-400 leading-snug">
            {t('update.permission_hint')}
          </p>
        )}
        {downloadError === 'failed' && (
          <p className="mb-3 text-xs text-red-500 leading-snug">
            {t('update.download_failed')}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onUpdate}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-black text-sm font-black uppercase tracking-widest hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-70"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('update.downloading')}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {t('update.button')}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onLater}
            disabled={downloading}
            className="w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition disabled:opacity-40"
          >
            {t('update.later')}
          </button>
        </div>

        <p className="mt-3 text-[10px] text-zinc-400 dark:text-zinc-600 text-center leading-snug">
          {t('update.hint')}
        </p>
      </motion.div>
    </div>
  );
}
