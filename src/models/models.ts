import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phoneNumber: string;
  walletAddress: string; // Unified wallet address across World, Mantle, zkSync
  password: string;
  privateKey: string; // Private key for the unified wallet
  tempOtp?: string;
  otpExpires?: number;
  failedPasswordAttempts: number;
  lockoutUntil?: number;
  isUnified: boolean; // Tracks if the wallet is unified across chains
}

const userSchema: Schema = new Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  privateKey: {
    type: String,
    required: true,
    unique: true,
  },
  tempOtp: {
    type: String,
    required: false,
  },
  otpExpires: {
    type: Number,
    required: false,
  },
  failedPasswordAttempts: {
    type: Number,
    required: true,
    default: 0,
  },
  lockoutUntil: {
    type: Number,
    required: false,
  },
  isUnified: {
    type: Boolean,
    required: true,
    default: false, // Defaults to false until unified via /api/token/unify
  },
});

export const User = mongoose.model<IUser>('User', userSchema);