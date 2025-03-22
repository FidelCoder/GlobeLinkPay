import mongoose, { Schema, Document } from 'mongoose';

export interface IVerification extends Document {
  providerId: string; // ID from the verification provider (e.g., Africa's Talking)
  providerName: string; // Name of the provider (e.g., "AfricasTalking")
  phoneNumber: string; // Phone number being verified
  proof: Record<string, unknown>; // Verification proof data (e.g., OTP response)
  verified: boolean; // Verification status
  createdAt: Date; // Timestamp of verification attempt
}

const verificationSchema: Schema = new Schema({
  providerId: {
    type: String,
  },
  providerName: {
    type: String,
  },
  phoneNumber: {
    type: String,
  },
  proof: {
    type: Schema.Types.Mixed,
  },
  verified: {
    type: Boolean,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Verification = mongoose.model<IVerification>('Verification', verificationSchema);