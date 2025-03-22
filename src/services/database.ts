import mongoose from 'mongoose';
import config from '../config/env';

const MONGO_URL = config.MONGO_URL;

// Debug: Check if the MongoDB URL is correctly loaded
console.log("MongoDB URL:", MONGO_URL);

export async function connect() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ Successfully connected to MongoDB");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
  }
}