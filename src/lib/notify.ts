/**
 * Local + FCM notification helpers for the GitHub Pages PWA (/DoneTogether/).
 * Absolute "/icon.png" paths break under the subdirectory — always resolve vs page URL.
 */

let messagingRegistration: ServiceWorkerRegistration | null = null;

export function publicAssetUrl(file: string): string {
    const clean = file.replace(/^\//, '');
    try {
        return new URL(clean, window.location.href).href;
    } catch {
        return clean;
    }
}

async function waitUntilActive(reg: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
    const sw = reg.installing || reg.waiting || reg.active;
    if (!sw) return reg;
    if (sw.state === 'activated') return reg;

    await new Promise<void>((resolve) => {
        const onChange = () => {
            if (sw.state === 'activated' || sw.state === 'redundant') {
                sw.removeEventListener('statechange', onChange);
                resolve();
            }
        };
        sw.addEventListener('statechange', onChange);
        // Safety timeout
        setTimeout(() => {
            sw.removeEventListener('statechange', onChange);
            resolve();
        }, 8000);
    });
    return reg;
}

/** Register firebase-messaging-sw.js under the app path (not site root). */
export async function ensureMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    if (messagingRegistration?.active) return messagingRegistration;

    try {
        const swUrl = new URL('firebase-messaging-sw.js', window.location.href).href;
        const scope = new URL('./', window.location.href).href;
        const reg = await navigator.serviceWorker.register(swUrl, { scope });
        await waitUntilActive(reg);
        // Prefer ready for this scope
        try {
            await navigator.serviceWorker.ready;
        } catch {
            /* ignore */
        }
        messagingRegistration = reg;
        return reg;
    } catch (e) {
        console.warn('[notify] SW register failed', e);
        return null;
    }
}

export async function ensureNotificationPermission(): Promise<boolean> {
    try {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;
        const result = await Notification.requestPermission();
        return result === 'granted';
    } catch {
        return false;
    }
}

/**
 * Show a system notification via the service worker when possible
 * (works better for installed PWAs / backgrounded tabs than `new Notification`).
 */
export async function showLocalNotification(
    title: string,
    body: string,
    opts?: { tag?: string; requireInteraction?: boolean }
): Promise<boolean> {
    const ok = await ensureNotificationPermission();
    if (!ok) return false;

    const icon = publicAssetUrl('pwa-icon.png');
    const tag = opts?.tag || `dt-${Date.now()}`;
    const options: NotificationOptions = {
        body,
        icon,
        badge: icon,
        tag,
        requireInteraction: opts?.requireInteraction ?? true,
        data: { url: window.location.href }
    };

    try {
        const reg =
            messagingRegistration ||
            (await ensureMessagingServiceWorker()) ||
            (await navigator.serviceWorker.getRegistration());

        if (reg?.showNotification) {
            await reg.showNotification(title, options);
            return true;
        }
    } catch (e) {
        console.warn('[notify] SW showNotification failed, falling back', e);
    }

    try {
        new Notification(title, options);
        return true;
    } catch (e) {
        console.warn('[notify] Notification constructor failed', e);
        return false;
    }
}
