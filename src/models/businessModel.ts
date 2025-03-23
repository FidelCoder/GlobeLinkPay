import mongoose, { Schema, Document } from 'mongoose';

export interface IBusiness extends Document {
  businessName: string;
  ownerName: string;
  phoneNumber: string;
  email: string;
  location: string;
  businessType: string;
  merchantId: string; // Borderless till number
  walletAddress: string;
  privateKey: string;
  userId: mongoose.Types.ObjectId; // Reference to the User
  uniqueCode?: string; // Optional: Used in tokenController.ts for payments
  chain: 'world' | 'mantle' | 'zksync'; // Add chain field
}

const businessSchema: Schema = new Schema<IBusiness>({
  businessName: {
    type: String,
    required: true,
    unique: true,
  },
  ownerName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  businessType: {
    type: String,
    required: true,
  },
  merchantId: {
    type: String,
    required: true,
    unique: true,
  },
  walletAddress: {
    type: String,
    required: true,
  },
  privateKey: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uniqueCode: {
    type: String,
    required: false,
    unique: true,
  },
  chain: {
    type: String,
    enum: ['world', 'mantle', 'zksync'],
    default: 'world', // Default to 'world' for consistency
  },
});

export const Business = mongoose.model<IBusiness>('Business', businessSchema);