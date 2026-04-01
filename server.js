require("dotenv").config();

const express    = require("express");
const mongoose   = require("mongoose");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const cors       = require("cors");
const path       = require("path");
const fs         = require("fs");
const multer     = require("multer");
const multerS3   = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

const { User, Workout, Diet, Goal } = require("./models");

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "fittrackpro_dev_secret_2024";

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── MongoDB ───────────────────────────────────────────────────────────────────
async function connectDB() {
  const primaryURI = process.env.MONGO_URI;
  const localURI   = "mongodb://localhost:27017/workoutdb";

  // 1. Try Atlas / Primary (from .env)
  if (primaryURI) {
    try {
      await mongoose.connect(primaryURI, { serverSelectionTimeoutMS: 5000 });
      console.log("✅ Connected to MongoDB Atlas");
      return;
    } catch (err) {
      console.warn("⚠️ Atlas connection failed (Likely IP Whitelist issue).");
    }
  }

  // 2. Try Local MongoDB (if the user has it installed and running)
  try {
    await mongoose.connect(localURI, { serverSelectionTimeoutMS: 2000 });
    console.log("📂 Connected to Local MongoDB (localhost:27017)");
    return;
  } catch (err) {
    console.warn("⚠️ Local MongoDB not found.");
  }

  // 3. Absolute Fallback: In-Memory MongoDB (Data resets on restart)
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    console.log("✅ Connected to in-memory MongoDB (Data will reset on restart)");
    console.log("👉 To save data permanently: Whitelist your IP in Atlas OR start a local MongoDB server.");
  } catch (err) {
    console.error("❌ All database fallback steps failed:", err.message);
    process.exit(1);
  }
}

connectDB();

// ─── S3 / Multer ──────────────────────────────────────────────────────────────
// Ensure local uploads directory exists
const UPLOADS_DIR = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

let upload = null;
let useS3 = false;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_BUCKET_NAME) {
  useS3 = true;
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  upload = multer({
    storage: multerS3({
      s3: s3Client, bucket: process.env.AWS_BUCKET_NAME, acl: "public-read",
      key: (_req, file, cb) => cb(null, `avatars/${Date.now()}-${file.originalname}`)
    }),
    fileFilter: (_req, file, cb) => cb(null, ["image/jpeg","image/png","image/gif","image/webp"].includes(file.mimetype)),
    limits: { fileSize: 5 * 1024 * 1024 }
  });
} else {
  // Local disk storage — files saved to public/uploads/ and served as /uploads/<filename>
  const diskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename:    (_req,  file, cb) => cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`)
  });
  upload = multer({
    storage: diskStorage,
    fileFilter: (_req, file, cb) => cb(null, ["image/jpeg","image/png","image/gif","image/webp"].includes(file.mimetype)),
    limits: { fileSize: 5 * 1024 * 1024 }
  });
}

// ─── JWT Auth Middleware ───────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }
  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, weight, height, age } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password are required" });
    if (await User.findOne({ email: email.toLowerCase().trim() }))
      return res.status(409).json({ error: "Email already registered" });
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(), email: email.toLowerCase().trim(), password: hashed,
      weight: weight || 0, height: height || 0, age: age || 0
    });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Invalid email or password" });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/auth/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/auth/profile", authMiddleware, upload.single("avatar"), async (req, res) => {
  try {
    const {
      name, weight, height, age, gender,
      fitnessGoal, activityLevel, fitnessLevel,
      targetWeight, waistCm, workoutDaysPerWeek,
      preferredWorkoutTime, dietaryPreference, injuries
    } = req.body;
    const updateData = {};
    if (name)                         updateData.name                = name.trim();
    if (weight              !== undefined) updateData.weight              = Number(weight);
    if (height              !== undefined) updateData.height              = Number(height);
    if (age                 !== undefined) updateData.age                 = Number(age);
    if (gender              !== undefined) updateData.gender              = gender;
    if (fitnessGoal         !== undefined) updateData.fitnessGoal         = fitnessGoal;
    if (activityLevel       !== undefined) updateData.activityLevel       = activityLevel;
    if (fitnessLevel        !== undefined) updateData.fitnessLevel        = fitnessLevel;
    if (targetWeight        !== undefined) updateData.targetWeight        = Number(targetWeight);
    if (waistCm             !== undefined) updateData.waistCm             = Number(waistCm);
    if (workoutDaysPerWeek  !== undefined) updateData.workoutDaysPerWeek  = Number(workoutDaysPerWeek);
    if (preferredWorkoutTime !== undefined) updateData.preferredWorkoutTime = preferredWorkoutTime;
    if (dietaryPreference   !== undefined) updateData.dietaryPreference   = dietaryPreference;
    if (injuries            !== undefined) updateData.injuries            = injuries;
    if (req.file) {
      updateData.avatar = useS3
        ? req.file.location
        : `/uploads/${req.file.filename}`;
    }
    const user = await User.findByIdAndUpdate(req.user.id, { $set: updateData }, { new: true, runValidators: true }).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORKOUT ROUTES  — stats BEFORE :id
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/workouts/stats/summary", authMiddleware, async (req, res) => {
  try {
    const userId   = req.user.id;
    const workouts = await Workout.find({ userId });
    const totalWorkouts = workouts.length;
    const totalMinutes  = workouts.reduce((s, w) => s + (w.duration || 0), 0);
    const totalCalories = workouts.reduce((s, w) => s + (w.calories || 0), 0);

    const now = new Date();
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd   = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const day = workouts.filter(w => new Date(w.date) >= dayStart && new Date(w.date) < dayEnd);
      last7.push({
        date:     dayStart.toISOString().split("T")[0],
        duration: day.reduce((s, w) => s + (w.duration || 0), 0),
        calories: day.reduce((s, w) => s + (w.calories || 0), 0),
        count:    day.length
      });
    }

    const categories = {};
    workouts.forEach(w => { categories[w.category] = (categories[w.category] || 0) + 1; });
    const activeGoals = await Goal.countDocuments({ userId, completed: false });
    res.json({ totalWorkouts, totalMinutes, totalCalories, activeGoals, last7, categories });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/workouts", authMiddleware, async (req, res) => {
  try {
    const { category, from, to } = req.query;
    const filter = { userId: req.user.id };
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    res.json(await Workout.find(filter).sort({ date: -1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/workouts", authMiddleware, async (req, res) => {
  try {
    const { title, category, duration, calories, exercises, notes, date } = req.body;
    if (!title || !duration) return res.status(400).json({ error: "Title and duration are required" });
    const workout = await Workout.create({
      userId: req.user.id, title, category, duration,
      calories: calories || 0, exercises: exercises || [], notes: notes || "",
      date: date ? new Date(date) : new Date()
    });
    res.status(201).json(workout);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/workouts/:id", authMiddleware, async (req, res) => {
  try {
    const w = await Workout.findOne({ _id: req.params.id, userId: req.user.id });
    if (!w) return res.status(404).json({ error: "Workout not found" });
    res.json(w);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/workouts/:id", authMiddleware, async (req, res) => {
  try {
    const { title, category, duration, calories, exercises, notes, date } = req.body;
    const w = await Workout.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { title, category, duration, calories, exercises, notes, ...(date && { date: new Date(date) }) } },
      { new: true, runValidators: true }
    );
    if (!w) return res.status(404).json({ error: "Workout not found" });
    res.json(w);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/workouts/:id", authMiddleware, async (req, res) => {
  try {
    const w = await Workout.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!w) return res.status(404).json({ error: "Workout not found" });
    res.json({ message: "Workout deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DIET ROUTES  — stats BEFORE :id
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/diet/stats/summary", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const meals  = await Diet.find({ userId });

    const totalMeals    = meals.length;
    const totalCalories = meals.reduce((s, m) => s + (m.totalCalories || 0), 0);
    const totalProtein  = meals.reduce((s, m) => s + (m.totalProtein  || 0), 0);
    const totalCarbs    = meals.reduce((s, m) => s + (m.totalCarbs    || 0), 0);
    const totalFat      = meals.reduce((s, m) => s + (m.totalFat      || 0), 0);

    // Today's totals
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);
    const todayMeals = meals.filter(m => new Date(m.date) >= todayStart && new Date(m.date) <= todayEnd);
    const todayCalories = todayMeals.reduce((s, m) => s + (m.totalCalories || 0), 0);

    // Last 7 days
    const now = new Date();
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd   = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const day = meals.filter(m => new Date(m.date) >= dayStart && new Date(m.date) < dayEnd);
      last7.push({
        date:     dayStart.toISOString().split("T")[0],
        calories: day.reduce((s, m) => s + (m.totalCalories || 0), 0),
        protein:  day.reduce((s, m) => s + (m.totalProtein  || 0), 0),
        count:    day.length
      });
    }

    // Meal type breakdown
    const mealTypes = {};
    meals.forEach(m => { mealTypes[m.mealType] = (mealTypes[m.mealType] || 0) + 1; });

    res.json({ totalMeals, totalCalories, totalProtein, totalCarbs, totalFat, todayCalories, last7, mealTypes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/diet", authMiddleware, async (req, res) => {
  try {
    const { mealType, from, to } = req.query;
    const filter = { userId: req.user.id };
    if (mealType) filter.mealType = mealType;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    res.json(await Diet.find(filter).sort({ date: -1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/diet", authMiddleware, async (req, res) => {
  try {
    const { name, mealType, foods, notes, date } = req.body;
    if (!name) return res.status(400).json({ error: "Meal name is required" });

    const foodList = (foods || []).filter(f => f.name);
    const totalCalories = foodList.reduce((s, f) => s + (Number(f.calories) || 0), 0);
    const totalProtein  = foodList.reduce((s, f) => s + (Number(f.protein)  || 0), 0);
    const totalCarbs    = foodList.reduce((s, f) => s + (Number(f.carbs)    || 0), 0);
    const totalFat      = foodList.reduce((s, f) => s + (Number(f.fat)      || 0), 0);

    const meal = await Diet.create({
      userId: req.user.id, name, mealType: mealType || "Other",
      foods: foodList, totalCalories, totalProtein, totalCarbs, totalFat,
      notes: notes || "",
      date: date ? new Date(date) : new Date()
    });
    res.status(201).json(meal);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/diet/:id", authMiddleware, async (req, res) => {
  try {
    const meal = await Diet.findOne({ _id: req.params.id, userId: req.user.id });
    if (!meal) return res.status(404).json({ error: "Meal not found" });
    res.json(meal);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/diet/:id", authMiddleware, async (req, res) => {
  try {
    const { name, mealType, foods, notes, date } = req.body;
    const foodList = (foods || []).filter(f => f.name);
    const totalCalories = foodList.reduce((s, f) => s + (Number(f.calories) || 0), 0);
    const totalProtein  = foodList.reduce((s, f) => s + (Number(f.protein)  || 0), 0);
    const totalCarbs    = foodList.reduce((s, f) => s + (Number(f.carbs)    || 0), 0);
    const totalFat      = foodList.reduce((s, f) => s + (Number(f.fat)      || 0), 0);

    const updateData = { foods: foodList, totalCalories, totalProtein, totalCarbs, totalFat };
    if (name)     updateData.name     = name;
    if (mealType) updateData.mealType = mealType;
    if (notes !== undefined) updateData.notes = notes;
    if (date)     updateData.date     = new Date(date);

    const meal = await Diet.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updateData }, { new: true, runValidators: true }
    );
    if (!meal) return res.status(404).json({ error: "Meal not found" });
    res.json(meal);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/diet/:id", authMiddleware, async (req, res) => {
  try {
    const meal = await Diet.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!meal) return res.status(404).json({ error: "Meal not found" });
    res.json({ message: "Meal deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GOAL ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/goals", authMiddleware, async (req, res) => {
  try {
    res.json(await Goal.find({ userId: req.user.id }).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/goals", authMiddleware, async (req, res) => {
  try {
    const { title, target, current, unit, deadline } = req.body;
    if (!title || target === undefined) return res.status(400).json({ error: "Title and target are required" });
    const c = Number(current) || 0, t = Number(target);
    const goal = await Goal.create({
      userId: req.user.id, title, target: t, current: c,
      unit: unit || "kg", deadline: deadline ? new Date(deadline) : undefined,
      completed: c >= t
    });
    res.status(201).json(goal);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/goals/:id", authMiddleware, async (req, res) => {
  try {
    const { title, target, current, unit, deadline } = req.body;
    const updateData = {};
    if (title    !== undefined) updateData.title   = title;
    if (target   !== undefined) updateData.target  = Number(target);
    if (current  !== undefined) updateData.current = Number(current);
    if (unit     !== undefined) updateData.unit    = unit;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;

    const t = updateData.target  ?? null;
    const c = updateData.current ?? null;
    if (t !== null && c !== null) updateData.completed = c >= t;
    else if (c !== null) {
      const ex = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
      if (ex) updateData.completed = c >= ex.target;
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updateData }, { new: true, runValidators: true }
    );
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    res.json(goal);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/goals/:id", authMiddleware, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!goal) return res.status(404).json({ error: "Goal not found" });
    res.json({ message: "Goal deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Catch-all ────────────────────────────────────────────────────────────────
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`🚀 FitTrack Pro running at http://localhost:${PORT}`));
