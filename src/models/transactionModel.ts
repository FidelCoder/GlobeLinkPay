import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  from: string; // Sender phoneNumber or walletAddress
  to: string; // Recipient phoneNumber, businessName, or walletAddress
  amount: string; // Amount as string (to handle decimals)
  token: string; // e.g., "USDC", "WETH", "ETH", "MNT"
  chain: 'world' | 'mantle' | 'zksync';
  transactionHash: string; // From blockchain
  type: 'transfer' | 'payment' | 'crosschain'; // Transaction type
  timestamp: number; // Unix timestamp
}

const TransactionSchema: Schema = new Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  amount: { type: String, required: true },
  token: { type: String, required: true },
  chain: { type: String, enum: ['world', 'mantle', 'zksync'], required: true },
  transactionHash: { type: String, required: true },
  type: { type: String, enum: ['transfer', 'payment', 'crosschain'], required: true },
  timestamp: { type: Number, required: true, default: Date.now },
});

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);