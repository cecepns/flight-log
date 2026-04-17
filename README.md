# Flight Log App

Fullstack flight log app:

- Frontend: React + Vite (JSX), TailwindCSS, PWA, Lucide React, React Hot Toast
- Backend: Express.js (single `server.js`), MySQL, JWT auth, file upload with Multer

## Features

- Login user
- 4 menu pages: Flights, Add, Summary, Settings
- Mobile bottom navigation
- CRUD flight logs (add, edit, delete) with toast alerts
- API pagination max 10 items per page
- API search (frontend with debounce)
- Flight fields:
  - Flight Number, Aircraft Type, Destination
  - Departure Date, Arrival Date
  - Est/Actual Departure & Arrival Time
  - Flying Hours, Rest Hours
  - Booked Total (FC, JC, PEY, EY)
  - Checked In Total (FC, JC, PEY, EY)
  - Notes
  - Upload pictures
- Add Crew:
  - Position, Name, Nationality
- Search by Flight Number, Aircraft Type, Crew Name, Destination

## Backend Setup

1. Create MySQL database and tables:

```bash
mysql -u root -p < backend/schema.sql
```

2. Setup backend env:

```bash
cd backend
cp .env.example .env
```

3. Run backend:

```bash
npm install
npm run dev
```

Default login seeded by SQL:

- Email: `demo@flightlog.com`
- Password: `password123`

## Frontend Setup

1. Setup frontend env:

```bash
cd frontend
cp .env.example .env
```

2. Run frontend:

```bash
npm install
npm run dev
```

3. Build frontend:

```bash
npm run build
```
# flight-log
