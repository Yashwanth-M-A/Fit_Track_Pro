# FitTrack Pro — Deployment Guide

## Prerequisites

- Node.js v18+ ([nodejs.org](https://nodejs.org))
- MongoDB v6+ running locally **or** a MongoDB Atlas connection string
- (Optional) AWS S3 bucket for profile photo uploads

---

## Quick Start (Local Development)

### 1. Clone / Extract the project

```bash
cd "Fit Track Pro"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
copy .env.example .env
```

Edit `.env` with your values:

```env
MONGO_URI=mongodb://localhost:27017/workoutdb
JWT_SECRET=your_very_long_random_secret_key_here
PORT=3000

# Optional — only needed for profile photo upload
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket
```

### 4. Start MongoDB (if running locally)

```bash
# Windows (if installed as service, it may already be running)
net start MongoDB

# Or start manually:
mongod --dbpath C:\data\db
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Deployment

### Start server

```bash
npm start
```

### Using PM2 (recommended for production)

```bash
npm install -g pm2
pm2 start server.js --name fittrack-pro
pm2 save
pm2 startup
```

---

## AWS S3 Setup (Optional — Profile Photos)

1. Create an S3 bucket in AWS Console
2. Enable public access (or use pre-signed URLs)
3. Configure CORS on the bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

4. Create an IAM user with `s3:PutObject` and `s3:GetObject` permissions
5. Add the credentials to your `.env` file

---

## MongoDB Atlas (Cloud Database)

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Whitelist your IP and create a database user
3. Copy the connection string and paste it into `MONGO_URI` in `.env`

```env
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/workoutdb
```

---

## Project Structure

```
Fit Track Pro/
├── server.js          # Express server + all API routes
├── models.js          # Mongoose schemas (User, Workout, Goal)
├── package.json       # Dependencies
├── .env               # Environment variables (never commit this!)
├── .env.example       # Template for .env
├── DEPLOYMENT.md      # This file
└── public/
    ├── index.html     # Login / Register page
    ├── dashboard.html # Stats + Charts
    ├── workouts.html  # Log & manage workouts
    ├── goals.html     # Set & track goals
    ├── profile.html   # Profile + BMI calculator
    ├── style.css      # Shared design system
    └── utils.js       # Shared JS utilities
```

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login → JWT token |
| GET | `/api/auth/profile` | Yes | Get profile |
| PUT | `/api/auth/profile` | Yes | Update profile + avatar |
| GET | `/api/workouts/stats/summary` | Yes | Dashboard stats |
| GET | `/api/workouts` | Yes | List workouts (filterable) |
| POST | `/api/workouts` | Yes | Log workout |
| GET | `/api/workouts/:id` | Yes | Get single workout |
| PUT | `/api/workouts/:id` | Yes | Update workout |
| DELETE | `/api/workouts/:id` | Yes | Delete workout |
| GET | `/api/goals` | Yes | List goals |
| POST | `/api/goals` | Yes | Add goal |
| PUT | `/api/goals/:id` | Yes | Update goal progress |
| DELETE | `/api/goals/:id` | Yes | Delete goal |

---

## Troubleshooting

**MongoDB connection error**: Make sure MongoDB is running on port 27017, or update `MONGO_URI` in `.env`.

**Port already in use**: Change `PORT=3000` to another port in `.env`.

**JWT errors**: Make sure `JWT_SECRET` is set in `.env` and is the same value as when tokens were issued.

**S3 upload not working**: The app works without S3 — profile photos just won't be persisted. Check that your bucket has public read access and CORS is configured.
