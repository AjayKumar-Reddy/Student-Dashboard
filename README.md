# 🎓 MSR Insight — Advanced Academic Reporting & Student Analytics Platform

![Version](https://img.shields.io/badge/Version-0.1.0-00ADB5?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?style=for-the-badge&logo=postgresql)
![Security](https://img.shields.io/badge/Encryption-AES--256--GCM-green?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Ready-orange?style=for-the-badge)

**MSR Insight** is a Next.js academic analytics and reporting platform designed for college students and proctors. It eliminates the hassle of navigating slow, outdated college portals by providing automated synchronization, instant persistent authentication, database-level encryption, rich visual analytics, grade simulation, and placement eligibility tracking.

---

## 🌟 Key Highlights at a Glance

* **🔒 One-Time Login (Persistent Session):** Log in once with your USN & Date of Birth—stay logged in for up to 30 days. No need to repeatedly re-enter credentials every time you open the app!
* **📱 Progressive Web App (PWA):** Easily add MSR Insight to your smartphone's Home Screen for a native app experience without installing from an app store.
* **🛡️ Data Encryption in Database:** All student authentication PINs and sensitive parameters stored in the database are encrypted using **AES-256-GCM** authenticated encryption with SHA-256 secret keys and random IVs.
* **📊 Advanced Analytics & Charts:** Visual SGPA/CGPA trends, class average comparisons, subject grade distributions, and attendance tracking via interactive Recharts.
* **🎮 Interactive CGPA Simulator:** Predict target CGPA and calculate exact required marks/credits for upcoming semesters.
* **💼 Placement Readiness Center:** Evaluate eligibility for Tier-1 and Tier-2 campus placement drives based on active CGPA, credits, and backlog status.
* **📝 Notes & PYQ Editor:** Integrated Tiptap rich-text editor for taking per-subject study notes and saving past question papers (PYQs).
* **📄 PDF Grade Report Download:** Generate and download official, beautifully formatted PDF grade cards with a single click.

---

## 📱 How to Use & Mobile Home Screen Setup

MSR Insight is built as a **Progressive Web App (PWA)**, allowing you to launch it directly from your smartphone or desktop home screen like a native application.

### 1. Adding Shortcut to Home Screen (Mobile & Desktop)

#### 🍏 iOS (iPhone / iPad — Safari)
1. Open the website URL in **Safari**.
2. Tap the **Share** icon (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>) at the bottom navigation bar.
3. Scroll down and select **"Add to Home Screen"** (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>).
4. Tap **Add** in the top-right corner.
5. The **MSR Insight** icon will now appear on your home screen for quick 1-tap access!

#### 🤖 Android (Google Chrome)
1. Open the website URL in **Google Chrome**.
2. A prompt banner **"Install Web App"** will appear automatically at the bottom or in the sidebar.
3. If no prompt appears, tap the **3 vertical dots (Menu)** in the top-right corner.
4. Select **"Install app"** or **"Add to Home Screen"**.
5. Tap **Install** to confirm.

> [!TIP]
> Once added to your Home Screen, MSR Insight opens in **Standalone Mode**—hiding browser address bars and UI controls for a full-screen native mobile feel!

---

## 🔒 Persistent Authentication (Log In Once)

Say goodbye to typing your USN and Date of Birth every single time you want to check your CIE marks or attendance.

### How it Works:
1. **First-Time Registration & Scraping:**
   - On initial login, enter your **USN** and **Date of Birth** (plus secondary auth details like Mother's/Father's phone or ABC ID last 4 digits if prompted).
   - Our automated Puppeteer engine securely authenticates with the official portal, fetches your profile, semester marks, credits, and historical records, and caches them into PostgreSQL.
2. **30-Day JWT Session Token:**
   - Upon successful synchronization, an HTTP-secured **30-day session token** is issued.
3. **Instant Database Logins:**
   - Subsequent visits to the application instantly verify your cached profile directly from the local database in milliseconds—**no re-entering of login credentials required**!
4. **Manual Sync & Refresh Cooldown:**
   - Need updated marks? Simply click the **"Update Marks"** button inside the dashboard. Built-in 5-minute cooldown timers prevent rate-limiting while keeping your records fresh.

---

## 🔐 Database Security & AES-256 Data Encryption

Security and user privacy are core priorities in MSR Insight.

> [!IMPORTANT]
> Raw student PINs, passcodes, and credentials are **NEVER stored in plain text** inside the database.

```
       Plain Text PIN (e.g. "1234")
                     │
                     ▼
  ┌─────────────────────────────────────┐
  │   AES-256-GCM Encryption Engine    │
  │  - Random 12-byte IV per record     │
  │  - SHA-256 Secret Key Derivation    │
  │  - Ciphertext + Auth Tag Generation │
  └─────────────────────────────────────┘
                     │
                     ▼
 Database Entry: "iv:authTag:encryptedCiphertext"
```

* **AES-256-GCM Authenticated Encryption:** Student portal authentication keys and sensitive fields are encrypted using `AES-256-GCM` before being written to PostgreSQL.
* **Random Initialization Vectors (IV):** Each encryption operation utilizes a fresh 12-byte cryptographically secure random IV, ensuring identical PINs yield completely different ciphertexts.
* **Authentication Tag Verification:** Prevents tampering; any modified payload in the database fails verification during decryption attempts.
* **Privacy & Self-Serve Data Deletion:** Students can permanently purge their synced profile, history, and encrypted keys at any time via the **"Delete Account"** modal (requires explicit USN confirmation).

---

## ✨ Core Features & Dashboard Capabilities

MSR Insight is divided into intuitive, feature-rich tabs:

### 1. 📊 Current Semester Performance
* **SGPA & Credit Tracking:** Displays current SGPA, credit progress towards degree completion (160 for regular entry / 120 for lateral entry), and overall attendance percentage.
* **CIE & SEE Subject Breakdown:** View assessment scores (T1, T2, AQ1, AQ2), total marks, credit weightage, and assigned grades (O, A+, A, B+, B, C, P, F).
* **Official PDF Downloads:** Download an officially structured PDF report card of your semester performance.

### 2. 📈 Visual Analytics & Class Comparisons
* **SGPA/CGPA Trend Line:** Interactive Recharts line chart illustrating academic progression across semesters.
* **Grade Distribution Pie/Bar:** Breakdown of earned grades across all subjects.
* **Class Average Comparison:** Radar and bar charts comparing student assessment scores against overall class averages.
* **Performance Insights:** Instant auto-detection of your top-performing (Best) and focus-needed (Weakest) subjects.

### 3. 🎮 CGPA & Target Grade Simulator
* **Interactive Grade Modeling:** Experiment with predicted grades (O to F) for ongoing subjects to instantly recalculate projected semester SGPA and cumulative CGPA.
* **Target Planning:** Determine the minimum marks required in final exams to maintain or boost your CGPA for placement cutoffs.

### 4. 💼 Placement Readiness & Tier Eligibility
* **Tier-1 & Tier-2 Criteria Match:** Automatic calculation of placement eligibility based on CGPA thresholds, credit quotas, and active backlogs.
* **Skill & Resume Optimization:** Insights into in-demand tech stack requirements and resume keyword optimizations for tech company hiring drives.

### 5. 📝 Notes & PYQ Workspace
* **Integrated WYSIWYG Editor:** Built-in rich-text editor powered by **Tiptap** (`@tiptap/react`).
* **Subject-wise Storage:** Organize study notes, key formulas, and Previous Year Questions (PYQs) per subject.
* **Markdown Export:** Seamlessly export notes as `.md` files.

### 6. 📜 Exam History Audit Trail
* Full historical archive of past semesters, SGPA breakdowns, subject credits, and grade history.

### 7. 🎉 Personalized Birthday Celebration
* Automatic festive birthday greeting banner displayed on the dashboard when logging in on your birthday.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling & UI** | Vanilla CSS + [Tailwind CSS 4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) |
| **Icons & Visuals** | [Lucide React Icons](https://lucide.dev/) + [Recharts](https://recharts.org/) |
| **Rich Text Editor** | [Tiptap Editor](https://tiptap.dev/) |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM 7.x](https://www.prisma.io/) |
| **Web Scraping Engine** | [Puppeteer](https://pptr.dev/) + [Cheerio](https://cheerio.js.org/) |
| **Authentication & Security** | JWT (`jsonwebtoken`) + Node.js `crypto` (AES-256-GCM) |
| **PDF Generation** | `html2pdf.js` |

---

## ⚙️ Developer Setup & Local Installation

If you are a developer looking to run or build MSR Insight locally:

### Prerequisites
* Node.js `v20.x` or higher
* npm or yarn
* PostgreSQL database instance

### 1. Clone & Install Dependencies
```bash
# Navigate to project root
cd student-dashboard

# Install npm packages
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# PostgreSQL Database URL
DATABASE_URL="postgresql://username:password@localhost:5432/student_dashboard?schema=public"

# Security Secrets
JWT_SECRET="your-custom-jwt-secret-key"
ENCRYPTION_SECRET="your-32-byte-aes-encryption-secret-key"

# Base URL (for API calls)
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000"
```

### 3. Setup Database Schema
Generate Prisma client and push schema to PostgreSQL:
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Repository Project Structure

```
student-dashboard/
├── prisma/
│   └── schema.prisma             # PostgreSQL Prisma Database Schema
├── public/
│   ├── manifest.json             # PWA Web Application Manifest
│   ├── sw.js                     # PWA Service Worker
│   └── logo-icon.png             # Mobile App Icons (192x192, 512x512)
├── src/
│   ├── app/                      # Next.js App Router Routes
│   │   ├── (auth)/               # Student & Proctor Login Routes
│   │   ├── (dashboard)/student/  # Student Dashboard Tab Layouts
│   │   └── api/                  # Auth, Profile, Sync & Report APIs
│   ├── components/
│   │   ├── dashboard/            # Dashboard Sections (Analytics, Performance, etc.)
│   │   └── ui/                   # Reusable UI Components
│   ├── lib/
│   │   ├── db.ts                 # Prisma Database Client
│   │   ├── services/             # Puppeteer Scraper Engine & Student Service
│   │   └── utils/                # AES-256 Crypto, JWT, & Date Helpers
│   └── styles/                   # Custom Global & Component CSS Styles
├── package.json
└── README.md
```

---

## 📄 License & Privacy

MSR Insight is created for educational and academic management purposes. Student data synchronized through the application is encrypted in PostgreSQL and managed with strict privacy controls. Users maintain full ownership and can request permanent data deletion at any time.

---

<p align="center">
  Crafted with ❤️ for students seeking a smarter, faster, and more secure academic experience.
</p>
