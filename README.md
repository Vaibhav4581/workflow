# 🎓 SNGCE Workflow System — Setup Guide

This is a full-stack web application built with **React (Vite)** on the frontend and **Node.js (Express)** on the backend, with **MongoDB Atlas** as the database.

---

## ✅ System Requirements

| Tool        | Required Version |
|-------------|-----------------|
| Node.js     | v18 or higher (developed on v24.14.1) |
| npm         | v9 or higher (developed on v11.11.0) |
| Git         | Any recent version |
| MongoDB     | Atlas cloud DB (no local install needed) |

> **Download Node.js (includes npm):** https://nodejs.org/en/download

---

## 📁 Project Structure

```
workflow/
├── backend/        ← Node.js + Express API server
│   ├── index.js
│   ├── .env        ← ⚠️ YOU MUST CREATE THIS (see below)
│   └── package.json
└── frontend/       ← React + Vite app
    ├── src/
    └── package.json
```

---

## ⚙️ Step 1: Configure Environment Variables

In the `backend/` folder, create a file named `.env` with the following content:

```env
PORT=3096
mongo_url=<your MongoDB Atlas connection string>
JWT_SECRET=sngce_workflow_secret_key_2024
```

> **Get your MongoDB Atlas connection string:**
> 1. Go to https://cloud.mongodb.com
> 2. Click your cluster → **Connect** → **Drivers**
> 3. Copy the connection string and replace `<password>` with your DB user's password.

---

## 📦 Step 2: Install Backend Dependencies

Open a terminal in the **`backend/`** folder and run:

```bash
cd backend
npm install
```

### Backend Packages Installed:
| Package                   | Version   | Purpose                          |
|---------------------------|-----------|----------------------------------|
| express                   | ^5.1.0    | Web server framework             |
| mongoose                  | ^8.16.2   | MongoDB object modeling          |
| mongoose-sequence         | ^6.0.1    | Auto-increment IDs               |
| mongoose-id-autoincrement | ^1.0.5    | Auto-increment IDs (legacy)      |
| mongodb-memory-server     | ^11.0.1   | In-memory DB for testing         |
| bcrypt                    | ^6.0.0    | Password hashing                 |
| jsonwebtoken              | ^9.0.2    | JWT authentication tokens        |
| cors                      | ^2.8.5    | Cross-Origin Resource Sharing    |
| dotenv                    | ^17.2.3   | Environment variable loader      |

---

## 📦 Step 3: Install Frontend Dependencies

Open a **new terminal** in the **`frontend/`** folder and run:

```bash
cd frontend
npm install
```

### Frontend Packages Installed:
| Package                  | Version   | Purpose                               |
|--------------------------|-----------|---------------------------------------|
| react                    | ^19.2.6   | Core UI library                       |
| react-dom                | ^19.2.6   | React DOM rendering                   |
| react-router-dom         | ^7.6.3    | Client-side routing                   |
| @mui/material            | ^7.2.0    | Material UI components                |
| @mui/icons-material      | ^7.2.0    | Material UI icons                     |
| @emotion/react           | ^11.14.0  | CSS-in-JS (MUI dependency)            |
| @emotion/styled          | ^11.14.1  | Styled components (MUI dependency)    |
| lucide-react             | ^1.14.0   | Icon library                          |
| axios                    | ^1.10.0   | HTTP client for API requests          |
| @tanstack/react-query    | ^5.101.2  | Data fetching and caching             |
| jwt-decode               | ^4.0.0    | Decode JWTs on the frontend           |
| jsonwebtoken             | ^9.0.2    | JWT utilities                         |
| react-hot-toast          | ^2.6.0    | Toast notifications                   |
| jspdf                    | ^3.0.1    | PDF generation                        |
| html2canvas              | ^1.4.1    | HTML to canvas (for PDF screenshots)  |
| pdf-parse                | ^2.4.5    | Parse uploaded PDFs                   |
| puppeteer                | ^25.3.0   | Headless browser automation           |
| recharts                 | ^3.8.1    | Charts and data visualization         |
| papaparse                | ^5.5.3    | CSV parsing                           |
| xlsx                     | ^0.18.5   | Excel file parsing                    |
| vite                     | ^8.0.0    | Frontend build tool (dev)             |
| @vitejs/plugin-react     | ^6.0.1    | React support for Vite (dev)          |

---

## 🚀 Step 4: Run the Project

### Start the Backend Server
```bash
cd backend
npm start
```
> Server runs on: **http://localhost:3096**

### Start the Frontend Dev Server
```bash
cd frontend
npm run dev
```
> App opens at: **http://localhost:5173**

> Both servers must be running at the same time — use two separate terminals.

---

## 👤 Step 5: Create an Admin Account

After starting both servers, run the seed script to create test users:

```bash
cd backend
node seed_test_users.js
```

---

## 🔑 Default Test Credentials (if seed script was run)

| Role             | Email                              | Password     |
|------------------|------------------------------------|--------------|
| Admin            | admin@sngce.ac.in                  | password123  |
| Principal        | principal@sngce.ac.in              | password123  |
| HOD (CSE)        | hod_cse@sngce.ac.in                | password123  |
| Faculty Advisor  | test_facultyadvisor@sngce.ac.in    | password123  |
| Student          | test_student@sngce.ac.in           | password123  |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Cannot connect to MongoDB | Check your `.env` mongo_url value |
| Port 3096 already in use | Change PORT in `.env` |
| npm install fails | Make sure Node.js v18+ is installed |
| Frontend cannot reach backend | Ensure backend is running on port 3096 |
| puppeteer install hangs | Run `npm install --ignore-scripts` and retry |

---

## Notes

- The `.env` file is not included in the project for security reasons. You must create it manually.
- The database is hosted on MongoDB Atlas (cloud). No local MongoDB installation is required.
- The frontend automatically proxies API calls to `http://localhost:3096` via Vite config.
