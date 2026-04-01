# FitTrack Pro — Full-Stack Fitness Tracker

FitTrack Pro is a professional-grade, full-stack fitness and nutrition application built with Node.js, Express, and MongoDB. It allows users to log workouts, track nutrition, set fitness goals, and calculate advanced health metrics like BMI, BMR, and TDEE.

## 🚀 Key Features

*   **📊 Dynamic Dashboard**: Your weekly workout duration and calorie burn at a glance.
*   **👤 Comprehensive Profile**: Track measurements, fitness levels, and detailed health analytics.
*   **⚖️ Advanced Health Metrics**: Real-time calculation of BMI, BMR, TDEE, and Waist-to-Height Ratio (WHtR).
*   **💪 Workout Logger**: Log your sessions with categorized badges and duration tracking.
*   **🥗 Nutrition & Diet**: Track meals and macros (Protein, Carbs, Fat) with daily summaries.
*   **🎯 Goal Management**: Set, update, and achieve personalized fitness targets.

## 🛠️ Technology Stack

*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB (Local or Atlas Cluster)
*   **Authentication**: JWT (JSON Web Tokens)
*   **Frontend**: Semantic HTML5, CSS3, JavaScript (Vanilla)
*   **Imagery**: Premium icons and high-quality fitness photography.

## 📂 Project Structure

```text
Fit Track Pro/
├── server.js          # Express server + API endpoints
├── models.js          # Mongoose database schemas
├── public/            # Frontend assets (HTML, CSS, JS)
├── package.json       # Dependencies and scripts
└── .env               # Environment variables (private)
```

## ⚙️ Quick Start (Local)

1.  **Clone the repository**: `git clone YOUR_REPO_URL`
2.  **Install dependencies**: `npm install`
3.  **Configure Environment**: Create a `.env` file based on `.env.example`.
4.  **Start the server**: `npm start`
5.  **Visit on Localhost**: `http://localhost:3000`

## ☁️ Deployment

This project is ready for deployment on **AWS App Runner**, **Heroku**, or **Digital Ocean**. To see it in action, ensure your MongoDB Atlas IP whitelist is set to `0.0.0.0/0` (Allow from anywhere) to allow your hosting provider to connect.

---
Developed by **FitTrack Pro Team**. License: MIT.
