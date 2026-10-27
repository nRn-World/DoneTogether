import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

const BANNER_AD_UNIT_ID = 'ca-app-pub-2518752253653498/2879490294';
// Google's official sample banner, always fills.
const TEST_BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';

// Space the banner must leave at the bottom: from the screen edge up to the highest point of
// the nav bar (includes the safe-area inset and the raised "+" button). Falls back to 80px.
async function navClearancePx() {
  for (let i = 0; i < 30; i++) {
    const footer = document.querySelector('footer');
    if (footer) {
      const top = Math.min(...[footer, ...footer.querySelectorAll('*')].map((el) => el.getBoundingClientRect().top));
      return Math.ceil(window.innerHeight - top);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return 80;
}

export async function initAds() {
  if (Capacitor.getPlatform() !== 'android') return;
  const isTesting = import.meta.env.MODE !== 'production';
  try {
    await AdMob.initialize();
    // GDPR/UMP: ask for consent in the EEA/UK before any ad loads. Without a published
    // consent message in AdMob the form is unavailable and we simply continue.
    try {
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }
    } catch (e) {
      console.warn('AdMob consent failed', e);
    }
    // Test ads in non-production builds (vite build --mode development) so we never click our own live ads.
    await AdMob.showBanner({
      adId: isTesting ? TEST_BANNER_AD_UNIT_ID : BANNER_AD_UNIT_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: await navClearancePx(),
      isTesting,
    });
  } catch (e) {
    console.warn('AdMob init failed', e);
  }
}
