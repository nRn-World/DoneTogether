import { useRef, useState, type ReactNode } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const btn = 'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-[11px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap';

/** "Take photo" (camera, via capture) + "Choose from gallery" buttons. */
export function PhotoButtons({ onFile }: { onFile: (file: File) => void }) {
  const { t } = useTranslation();
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = ''; // allow picking the same file again
  };
  return (
    <div className="flex gap-2">
      <button type="button" className={btn} onClick={() => cam.current?.click()}>
        <Camera className="w-4 h-4" />{t('plans.take_photo')}
      </button>
      <button type="button" className={btn} onClick={() => gal.current?.click()}>
        <ImageIcon className="w-4 h-4" />{t('plans.choose_photo')}
      </button>
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      <input ref={gal} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}

/** Icon button that opens a small menu with the two photo choices. */
export function PhotoPicker({ onFile, className, ariaLabel, children }: {
  onFile: (file: File) => void; className: string; ariaLabel: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" aria-label={ariaLabel} aria-expanded={open} onClick={() => setOpen((o) => !o)} className={className}>
        {children}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 bottom-full mb-2 z-50 w-72 p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <PhotoButtons onFile={(f) => { onFile(f); setOpen(false); }} />
          </div>
        </>
      )}
    </div>
  );
}
