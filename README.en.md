# POI Information Service Platform & WebGIS Client

This project is a full-stack Location-Based Service (LBS) application that provides management, query, and visualization of Points of Interest (POI) data. It consists of a Node.js RESTful API backend and a modern Vue 3-based frontend client.
![项目演示 ](https://github.com/user-attachments/assets/642c7942-2cd9-4759-9957-812619645333)

---

## 🚀 Core Features

### 🔐 Role-Based Access & Authentication

* Roles: Administrator / Public User
* JWT-based authentication system (register / login)

### 📦 POI Data Management (Admin)

* Full CRUD operations
* Support bulk import from GeoJSON files

### 🔍 POI Search (Public User)

* Filter by name, region, category, etc.
* Map-based queries: rectangle selection or radius from center
* API KEY management (planned)

### 🗺️ Map Visualization & UI

* Display POIs as markers on AMap (Gaode Map)
* Rich UI: table list, pagination, forms, and interactive popups

---

## 🧱 Tech Stack

| Layer      | Technology                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| Frontend   | Vue 3 (Composition API + `<script setup>`), Vite, Element Plus, Pinia, Vue Router, Axios, AMap JSAPI v2.0 |
| Backend    | Node.js, Express.js, MongoDB, Mongoose                                                                    |
| Auth       | JWT (jsonwebtoken), bcryptjs                                                                              |
| Data Tools | mongoimport, Python (pymongo) scripts                                                                     |
| Dev Tools  | VS Code, Git, Postman, Gitee/GitHub                                                                       |

---

## 📦 Setup & Run Instructions

The project consists of two parts: `backend/` and `vueproject/`. Both must be started independently.

### ✅ Backend Setup

#### Prerequisites

* Install Node.js (LTS recommended)
* Install and run MongoDB
* Install MongoDB Database Tools (for `mongoimport`)

#### Install dependencies

```bash
cd backend
npm install
```

#### Create `.env` file in `backend/`

```env
MONGO_URI=mongodb://localhost:27017/poi-system
JWT_SECRET=your_super_secret_key
```

#### (Optional) Import initial POI data

Make sure you have a JSON array file like `pois_for_import.json`

```bash
mongoimport --db poi-system --collection pois --file pois_for_import.json --jsonArray
```

#### Start the backend

```bash
node app.js
```

You should see: `Server running on port 3000` and `MongoDB connected`

---

### ✅ Frontend Setup

#### Install dependencies

```bash
cd vueproject
npm install
```

#### Create `.env.development` in `vueproject/`

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_AMAP_KEY=your_amap_js_api_key
```

#### Configuration Notes

* Make sure `vite.config.ts` does not use `server.proxy`
* Disable mock data in `src/main.ts`

#### Start frontend server

```bash
npm run dev
```

Visit: `http://localhost:5173/`

---

## 📚 API Endpoints Overview

| Method | Endpoint              | Description                   |
| ------ | --------------------- | ----------------------------- |
| POST   | `/api/auth/register`  | Register a new user           |
| POST   | `/api/auth/login`     | User login                    |
| GET    | `/api/poi/list`       | Query POIs (supports filters) |
| POST   | `/api/poi/add`        | Add new POI (admin only)      |
| PUT    | `/api/poi/update/:id` | Update POI by ID (admin only) |

---

## 📌 TODO (Planned Features)

* [ ] API KEY generation and management
* [ ] POI category layer control
* [ ] Accessibility analysis & routing services
* [ ] GeoServer / PostGIS backend support

---

## 📖 License

MIT License — feel free to use, modify, and contribute.

---

> Found this project helpful? Star ⭐, fork 🍴, or open an issue 🛠️ on GitHub!
