# DoneTogether — Product Specification

## Purpose
DoneTogether is a collaborative planning app where friends create shared plans, check off tasks together in real time, celebrate progress with photos and reactions, and get location-based reminders when approaching or leaving places.

## Target users
- Friends and small groups who plan activities, errands, shopping, or shared to-do lists together.
- Web users and Android app users (Capacitor).

## Core features

### Authentication
- Users can sign in with **Google**.
- Users can sign in with **Email and Password**.
- Unauthenticated users can view the landing/home marketing UI but must sign in before creating plans, joining plans, or managing friends.
- Language switcher is available on the login modal (English, Swedish, Turkish). Changing language must update visible UI text without breaking login actions.

### Home / Landing
- Brand and product messaging for planning together.
- Actions: **Create new plan**, **Join plan**, view **Active plans** (when signed in).
- Theme toggle (light/dark).
- Language switcher.
- Friends entry point.

### Plans
- Create a plan with a name and optional items.
- View plan progress (completed steps vs total).
- Add, edit, and delete checklist items.
- Check/uncheck items in real time; show who completed an item.
- Attach photos to completed items.
- Add emoji reactions to items.
- Share invite link / invite code so others can join.
- Delete plan (owner rules apply for active plans).
- Reopen completed plans.
- Completed plans appear in a history / wall-of-fame style view.

### Friends
- Search users by email (Gmail address).
- Send friend requests.
- Accept or decline incoming requests.
- View friend list and remove friends.

### Location & geofencing
- Request location permission after login.
- Attach locations to checklist items with a radius.
- Triggers for enter (near place) or exit (leave place).
- Saved locations (home, work, favorites) for quicker picking.
- Address autocomplete / location picker.

### Notifications & updates
- In-app update prompt when a newer Android version is available.
- Push/notification support for relevant plan activity where configured.

## Languages
- English (`en`)
- Swedish (`sv`)
- Turkish (`tr`)
All primary UI strings should be translated. Login and main flows must remain usable after language changes.

## Platforms
- Web (Vite + React)
- Android (Capacitor wrapper of the same web app)

## Success criteria for testing
1. Landing page loads and language switching works.
2. Login modal opens; Google and Email login options are visible and interactive.
3. Email/password login with valid test credentials signs the user in.
4. Signed-in user can create a plan, add items, check items, and see progress update.
5. Signed-in user can open Friends, search, and see friend list UI.
6. Join-plan flow accepts an invite code/link UI without crashing.
7. Theme toggle switches light/dark without breaking layout.
8. Closing modals (auth, create, join, friends, share) works via close controls.
9. No disabled “coming soon” login controls that look like broken actions.
10. Core flows work in Swedish after switching language from English.

## Out of scope for automated UI testing
- Completing a full Google OAuth popup flow in headless automation (use email/password test account instead).
- Native Android-only installer permissions beyond web UI messaging.
- Real GPS hardware geofence firing (UI for setting location is in scope; physical enter/exit events are optional).
