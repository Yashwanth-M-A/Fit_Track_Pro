const mongoose = require("mongoose");

// ─── User Model ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      { type: String, required: true },
  avatar:        { type: String, default: "" },
  weight:        { type: Number, default: 0 },
  height:        { type: Number, default: 0 },
  age:                   { type: Number, default: 0 },
  gender:                { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
  fitnessGoal:           { type: String, enum: ["Lose Weight", "Build Muscle", "Improve Endurance", "Stay Active", "Flexibility", ""], default: "" },
  activityLevel:         { type: String, enum: ["Sedentary", "Lightly Active", "Moderately Active", "Very Active", "Athlete", ""], default: "" },
  fitnessLevel:          { type: String, enum: ["Beginner", "Intermediate", "Advanced", ""], default: "" },
  targetWeight:          { type: Number, default: 0 },
  waistCm:               { type: Number, default: 0 },
  workoutDaysPerWeek:    { type: Number, default: 0, min: 0, max: 7 },
  preferredWorkoutTime:  { type: String, enum: ["Morning", "Afternoon", "Evening", "Night", ""], default: "" },
  dietaryPreference:     { type: String, enum: ["No Restriction", "Vegetarian", "Vegan", "Keto", "Paleo", "Gluten-Free", ""], default: "" },
  injuries:              { type: String, default: "" },
  createdAt:             { type: Date, default: Date.now }
});

// ─── Workout Model ────────────────────────────────────────────────────────────
const exerciseSchema = new mongoose.Schema({
  name:   { type: String, default: "" },
  sets:   { type: Number, default: 0 },
  reps:   { type: Number, default: 0 },
  weight: { type: Number, default: 0 }
}, { _id: false });

const workoutSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:     { type: String, required: true, trim: true },
  category:  { type: String, enum: ["Cardio", "Strength", "Flexibility", "Sports", "Other"], default: "Other" },
  duration:  { type: Number, required: true },
  calories:  { type: Number, default: 0 },
  exercises: { type: [exerciseSchema], default: [] },
  notes:     { type: String, default: "" },
  date:      { type: Date, default: Date.now }
});

// ─── Diet / Meal Model ────────────────────────────────────────────────────────
const foodItemSchema = new mongoose.Schema({
  name:     { type: String, default: "" },
  quantity: { type: Number, default: 0 },
  unit:     { type: String, default: "g" },
  calories: { type: Number, default: 0 },
  protein:  { type: Number, default: 0 },
  carbs:    { type: Number, default: 0 },
  fat:      { type: Number, default: 0 }
}, { _id: false });

const dietSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name:          { type: String, required: true, trim: true },
  mealType:      { type: String, enum: ["Breakfast", "Lunch", "Dinner", "Snack", "Other"], default: "Other" },
  foods:         { type: [foodItemSchema], default: [] },
  totalCalories: { type: Number, default: 0 },
  totalProtein:  { type: Number, default: 0 },
  totalCarbs:    { type: Number, default: 0 },
  totalFat:      { type: Number, default: 0 },
  notes:         { type: String, default: "" },
  date:          { type: Date, default: Date.now }
});

// ─── Goal Model ───────────────────────────────────────────────────────────────
const goalSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:     { type: String, required: true, trim: true },
  target:    { type: Number, required: true },
  current:   { type: Number, default: 0 },
  unit:      { type: String, default: "kg" },
  deadline:  { type: Date },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User    = mongoose.model("User",    userSchema);
const Workout = mongoose.model("Workout", workoutSchema);
const Diet    = mongoose.model("Diet",    dietSchema);
const Goal    = mongoose.model("Goal",    goalSchema);

module.exports = { User, Workout, Diet, Goal };
