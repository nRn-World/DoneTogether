# DoneTogether

**Shared plans. Real-time checklists. Optional GPS reminders.**

[![License](https://img.shields.io/badge/license-Non--Commercial-orange.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2.2-green.svg)](https://github.com/nRn-World/DoneTogether/releases)
[![Status](https://img.shields.io/badge/status-Live-success.svg)](https://nrnworld.one/DoneTogether/)
[![Google Play](https://img.shields.io/badge/Google%20Play-Download-414141?logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=nrn.DoneTogether.com)

DoneTogether is a free collaborative planning app for families and friends.
Create a shared plan, invite others with a link, and check items off together
in real time. You can also attach location reminders (enter or leave a place)
so people get notified when they need them most.

**Live app:** [https://nrnworld.one/DoneTogether/](https://nrnworld.one/DoneTogether/)  
**Info & Android download:** [https://nrnworld.one/p/donetogether](https://nrnworld.one/p/donetogether)  
**Google Play:** [Download DoneTogether on Google Play](https://play.google.com/store/apps/details?id=nrn.DoneTogether.com)  
**Repository:** [https://github.com/nRn-World/DoneTogether](https://github.com/nRn-World/DoneTogether)

---

## Why it exists

The project started as a simple to-do idea and quickly grew into something more:
shared family plans plus GPS reminders for everyday life (medicine, school runs,
shopping lists, and similar).

It was prototyped with Google AI Studio, then developed further locally with
Cursor, OpenCode, and Codex agents over many months until it was ready for
public use.

---

## Features

- **Shared plans** – invite family or friends with a link or code
- **Real-time sync** – when someone checks an item, everyone sees it
- **GPS reminders** – notify on enter or leave around a chosen address
- **Photos & reactions** – celebrate finished items together
- **Friends** – find people by email and share plans more easily
- **Plan notifications** – owners can turn member alerts on or off (off by default)
- **Languages** – Swedish, English, Turkish
- **Web + Android** – use in the browser or install the Android app
- **Google sign-in** – simple login with your Google account

---

## Screenshots

| Login | Create plan | Plan details |
|:-----:|:-----------:|:------------:|
| <img src="screenshot/login.png" alt="Login" width="240"/> | <img src="screenshot/create.png" alt="Create plan" width="240"/> | <img src="screenshot/creat2.png" alt="Plan details" width="240"/> |

---

## Tech stack

| Area | Stack |
|------|--------|
| Frontend | React 19, TypeScript, Vite |
| UI | Tailwind CSS, Framer Motion |
| Backend | Firebase Auth, Firestore, Messaging |
| Mobile | Capacitor (Android) |

---

## Getting started (local)

### Prerequisites

- Node.js 18+
- npm
- A Firebase project (Auth + Firestore)
- Optional: Android Studio for native builds

### Setup

```bash
git clone https://github.com/nRn-World/DoneTogether.git
cd DoneTogether
npm install
```

Copy environment variables:

```bash
cp .env.example .env
```

Fill in Firebase, Google OAuth, Maps, and VAPID keys in `.env`.

Start the development server:

```bash
npm run dev
```

### Android (optional)

```bash
npm run build
npx cap sync android
npx cap open android
```

---

## Privacy

DoneTogether is built to stay simple. There is no advertising stack and no
unnecessary personal data collection beyond what is needed to run accounts,
plans, and optional push/location features you choose to enable.

The operator admin view only shows high-level usage counts (for example how
many people use the app or have installed it). It is not a tool for reading
other users’ private plan contents.

---

## License (important)

This project is licensed under the **DoneTogether Non-Commercial License**.
See [LICENSE](LICENSE) for the full text.

**You may:**

- download and run the project
- study and modify it for learning / education
- share non-commercial copies with attribution

**You may not:**

- sell DoneTogether or charge money for it
- monetize a copy or derivative that is based on DoneTogether
- use it as the basis of a paid product or paid service

In short: learn from it freely. Do not make money from a copied DoneTogether.

---

## Author & support

Created by **nRn World** (2026)  
Email: [bynrnworld@gmail.com](mailto:bynrnworld@gmail.com)

If the app is useful to you:

- Star the repository on GitHub
- Share it with people who might need it
- Optional support: [Ko-fi](https://ko-fi.com/nrnworld)

---

Made with care by nRn World.
