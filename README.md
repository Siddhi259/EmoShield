# 🛡 EmoShield

> **Centralized Emotion-Aware Multi-Platform Cyber Threat Detection System**  
> AI · NLP · Computer Vision · Face Emotion Analysis

[![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green?style=flat-square)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-cyan?style=flat-square)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-success?style=flat-square)](https://mongodb.com)

---

## 📁 Complete Git Repository Structure

```
emoshield/                          ← ROOT of GitHub repo
│
├── README.md                       ← This file
├── .gitignore                      ← Files to ignore
│
├── backend/                        ← Python FastAPI server
│   ├── main.py                     ← App entry point + all routes
│   ├── requirements.txt            ← All Python packages
│   ├── .env.example                ← Copy to .env and fill keys
│   ├── Procfile                    ← For Render deployment
│   └── src/
│       ├── auth/
│       │   ├── __init__.py
│       │   ├── jwt_handler.py      ← JWT token create/verify
│       │   ├── google_auth.py      ← Google OAuth login
│       │   └── otp_service.py      ← SMS OTP via Twilio
│       ├── analyzers/
│       │   ├── __init__.py
│       │   ├── threat_analyzer.py  ← NLP + ML engine (core)
│       │   └── face_analyzer.py    ← Face emotion detection
│       ├── integrations/
│       │   ├── __init__.py
│       │   ├── gmail_integration.py       ← Gmail API
│       │   └── platform_integrations.py  ← WhatsApp + Instagram + SMS
│       ├── models/
│       │   ├── __init__.py
│       │   └── database.py         ← MongoDB connection + schemas
│       └── utils/
│           ├── __init__.py
│           ├── config.py           ← Settings from .env
│           └── encryption.py      ← AES-256 token encryption
│
├── frontend/                       ← React + Vite + Tailwind
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   └── src/
│       ├── main.jsx                ← React entry point
│       ├── App.jsx                 ← Routes
│       ├── styles/
│       │   └── globals.css         ← Tailwind + custom styles
│       ├── utils/
│       │   └── api.js              ← Axios client + all API calls
│       ├── hooks/
│       │   └── useAuth.jsx         ← Auth context (global state)
│       ├── components/
│       │   └── common/
│       │       └── Layout.jsx      ← Sidebar + header wrapper
│       └── pages/
│           ├── LoginPage.jsx       ← Google sign in
│           ├── AuthCallback.jsx    ← OAuth redirect handler
│           ├── DashboardPage.jsx   ← Home with stats + charts
│           ├── ScanPage.jsx        ← Message + face dual scan
│           ├── GmailPage.jsx       ← Gmail inbox monitor
│           ├── PlatformsPage.jsx   ← Connect accounts + OTP
│           ├── HistoryPage.jsx     ← Past scans
│           ├── AnalyticsPage.jsx   ← Charts + insights
│           └── SettingsPage.jsx    ← User preferences
│
└── docs/
    ├── setup_guide.md             ← API keys setup guide
    └── deployment.md              ← Render + Vercel deploy guide
```

---


## 🌐 Deployment

| Service | What to deploy | Cost |
|---|---|---|
| [Render.com](https://render.com) | Backend (FastAPI) | 
| [Vercel.com](https://vercel.com) | Frontend (React) | 
| [MongoDB Atlas](https://cloud.mongodb.com) | Database | 

See `docs/deployment.md` for step-by-step instructions.

---

## 🔑 Required API Keys

| Key | Get From | Required? |
|---|---|---|
| Google Client ID + Secret | console.cloud.google.com |
| MongoDB Connection URL | cloud.mongodb.com |
| JWT Secret Key | Any random 32+ char string |
| Twilio (SMS OTP) | twilio.com | Optional |
| Instagram App | developers.facebook.com |
| WhatsApp Business | developers.facebook.com |

---

*EmoShield v1.0 — Final Year Project | CSE 2025–26*
