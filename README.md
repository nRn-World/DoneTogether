# 🚀 DoneTogether - Smart Task Management

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Version](https://img.shields.io/badge/version-1.0.0-green.svg) ![Status](https://img.shields.io/badge/status-Active-success.svg)

**DoneTogether** is a modern and intelligent task manager designed to make planning and collaboration easy, fast, and fun. Whether it's the family grocery list, your team's project plan, or your personal to-do list, DoneTogether helps you get things done – together.

---

## 💡 What is DoneTogether?

DoneTogether is more than just a to-do list. It's a **Smart Task** tool that syncs your plans in real time across all devices. With a focus on usability and visual feedback, the app makes it easy to organize everyday life.

### ✨ Key Features

*   **🔄 Real-time sync:** All changes update instantly for everyone invited. No delay, no hassle.
*   **👥 Smart collaboration:** Invite friends and family by email or unique links. Work together on shared lists.
*   **📸 Visual planning:** Add images to tasks to clarify what needs to be done or to celebrate progress.
*   **📱 Cross-platform:** Works seamlessly on Android, iOS (via web), and desktop.
*   **🎨 Modern design:** A clean dark theme that's easy on the eyes and battery.
*   **🔒 Security:** All data is stored securely with Google Firebase and communication is encrypted.
*   **🧹 Auto-cleanup:** Completed lists are archived automatically to keep your view clean and focused.

---

## 📸 Screenshots

| Login | Create Plan | Task details |
|:-----:|:-----------:|:------------:|
| <img src="screenshot/login.png" alt="Login screen" width="240"/> | <img src="screenshot/create.png" alt="Create task" width="240"/> | <img src="screenshot/creat2.png" alt="Task details" width="240"/> |

---

## 🛠️ Tech Stack

The project is built with the latest and most robust technology to guarantee performance and scalability:

*   **Frontend:** React 19, TypeScript, Vite
*   **Styling:** Tailwind CSS, Framer Motion
*   **Backend & Database:** Google Firebase (Firestore, Auth, Storage)
*   **Mobile:** Capacitor (Android/iOS native wrapper)

---

## 🚀 Installation & Getting Started

Follow these steps to run the project locally on your computer.

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   Android Studio (for mobile development)

### Step by step

1.  **Clone the repo**
    ```bash
    git clone https://github.com/RobinAyzit/DoneTogether.git
    cd DoneTogether
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    *   Copy [.env.example](cci:7://file:///d:/APPS%20By%20RobinAyzit/DoneTogether/.env.example:0:0-0:0) to [.env](cci:7://file:///d:/APPS%20By%20RobinAyzit/DoneTogether/.env:0:0-0:0): `cp .env.example .env`
    *   Add your Google Maps API key to [.env](cci:7://file:///d:/APPS%20By%20RobinAyzit/DoneTogether/.env:0:0-0:0) file
    *   Get API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

4.  **Configure Firebase**
    *   Create a project in [Firebase Console](https://console.firebase.google.com).
    *   Copy your config into [src/lib/firebase.ts](cci:7://file:///d:/APPS%20By%20RobinAyzit/DoneTogether/src/lib/firebase.ts:0:0-0:0).
    *   Enable Google Auth and Firestore Database.

5.  **Start the dev server**
    ```bash
    npm run dev
    ```

6.  **Build for Android (optional)**
    ```bash
    npm run build
    npx cap sync
    npx cap open android
    ```

---

📄 **License**  
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

👨‍💻 **Author**  
Created 2026 by © nRn World
📧 bynrnworld@gmail.com

## 🙏 Support

If you like this project, consider:

* ⭐ Star the project on GitHub  
* ☕ [Buy me a coffee](https://buymeacoffee.com/nrnworld)  
* 📢 Share with your friends  
* ☕ Buying me a coffee  
* 📢 Sharing with your friends
