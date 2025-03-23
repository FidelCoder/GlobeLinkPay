import { User } from '../models/models';
import { Transaction } from '../models/transactionModel';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createAccount, generateOTP, otpStore, africastalking, SALT_ROUNDS } from '../services/auth';
import { handleError } from '../services/utils';
import config from '../config/env';
import { ethers } from 'ethers';

// Define chain type for type safety
type Chain = 'world' | 'mantle' | 'zksync';

// Mock PROVIDERS for simulation (no live RPCs)
const PROVIDERS: Record<Chain, any> = {
  world: { simulate: true },
  mantle: { simulate: true },
  zksync: { simulate: true },
};

// USDC Contract Addresses with explicit typing
const USDC_ADDRESSES: Record<Chain, string> = {
  world: '0x1c7D4B196Cb0C7B01d743fbc6116a902379C7238', // Sepolia USDC
  mantle: '', // No standard USDC on Mantle Testnet; falls back to MNT
  zksync: '0x05a9C1bC9F7359BF9DF8fED53fBCc66E59e...', // zkSync Testnet (incomplete; update if known)
};

// ERC20 ABI (minimal for transfer and balanceOf) - kept for reference
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function balanceOf(address account) public view returns (uint256)',
];

// Authentication-related functions
export const initiateRegisterUser = async (req: Request, res: Response): Promise<Response> => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).send({ message: 'Phone number and password are required!' });
  }

  try {
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(409).send({ message: 'Phone number already registered!' });
    }

    const otp = generateOTP();
    otpStore[phoneNumber] = otp;

    console.log(`✅ OTP generated for ${phoneNumber}: ${otp}`);

    const smsResponse: any = await africastalking.SMS.send({
      to: [phoneNumber],
      message: `Your verification code is: ${otp}`,
      from: 'NEXUSPAY',
    });

    console.log('📨 Full SMS API Response:', JSON.stringify(smsResponse, null, 2));

    const recipients = smsResponse?.SMSMessageData?.Recipients || smsResponse?.data?.SMSMessageData?.Recipients || [];

    if (recipients.length === 0) {
      console.error('❌ No recipients found in the response:', smsResponse);
      return res.status(400).send({ message: 'Failed to send OTP. No recipients found.' });
    }

    const recipient = recipients[0];
    if (recipient.status !== 'Success') {
      console.error(`❌ SMS sending failed for ${phoneNumber}:`, recipient);
      return res.status(400).send({
        message: 'Failed to send OTP. Check your number and try again.',
        error: recipient,
      });
    }

    return res.send({ message: 'OTP sent successfully. Please verify to complete registration.' });
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    return handleError(error, res, 'Failed to send OTP', 500);
  }
};

export const registerUser = async (req: Request, res: Response): Promise<Response> => {
  const { phoneNumber, password, otp, chain = 'world' } = req.body;

  if (!phoneNumber || !password || !otp) {
    return res.status(400).send({ message: 'Phone number, password, and OTP are required!' });
  }

  if (!['world', 'mantle', 'zksync'].includes(chain)) {
    return res.status(400).send({ message: "Invalid chain. Use 'world', 'mantle', or 'zksync'" });
  }

  if (!otpStore[phoneNumber] || otpStore[phoneNumber] !== otp) {
    return res.status(400).send({ message: 'Invalid or expired OTP.' });
  }

  delete otpStore[phoneNumber];

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userSmartAccount = await createAccount(chain);
    const { pk, walletAddress } = userSmartAccount;

    const newUser = new User({
      phoneNumber,
      walletAddress,
      password: hashedPassword,
      privateKey: pk,
      chain,
    });
    await newUser.save();

    const token = jwt.sign(
      { _id: newUser._id, phoneNumber: newUser.phoneNumber, walletAddress: newUser.walletAddress, chain: newUser.chain },
      config.JWT_SECRET || 'zero',
      { expiresIn: '1h' }
    );

    return res.send({
      token,
      message: 'Registered successfully!',
      walletAddress: newUser.walletAddress,
      phoneNumber: newUser.phoneNumber,
      chain: newUser.chain,
    });
  } catch (error) {
    return handleError(error, res, 'Error registering user');
  }
};

export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).send({ message: 'Phone number and password are required!' });
  }

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ message: 'Invalid credentials!' });
    }

    const token = jwt.sign(
      { _id: user._id, phoneNumber: user.phoneNumber, walletAddress: user.walletAddress, chain: user.chain },
      config.JWT_SECRET || 'zero',
      { expiresIn: '1h' }
    );

    return res.send({
      token,
      message: 'Logged in successfully!',
      walletAddress: user.walletAddress,
      phoneNumber: user.phoneNumber,
      chain: user.chain,
    });
  } catch (error) {
    return handleError(error, res, 'Failed to login');
  }
};

export const requestPasswordReset = async (req: Request, res: Response): Promise<Response> => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).send({ message: 'Phone number is required!' });
  }

  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).send({ message: 'User not found.' });
    }

    const otp = generateOTP();
    otpStore[phoneNumber] = otp;

    console.log(`✅ Password Reset OTP generated for ${phoneNumber}: ${otp}`);

    const smsResponse: any = await africastalking.SMS.send({
      to: [phoneNumber],
      message: `Your password reset code is: ${otp}`,
      from: 'NEXUSPAY',
    });

    console.log('📨 Full SMS API Response:', JSON.stringify(smsResponse, null, 2));

    const recipients = smsResponse?.SMSMessageData?.Recipients || smsResponse?.data?.SMSMessageData?.Recipients || [];

    if (!recipients || recipients.length === 0) {
      console.error('❌ No recipients found in the response:', smsResponse);
      return res.status(400).send({ message: 'Failed to send OTP. No recipients found.' });
    }

    const recipient = recipients[0];
    if (recipient.status !== 'Success') {
      console.error(`❌ SMS sending failed for ${phoneNumber}:`, recipient);
      return res.status(400).send({
        message: 'Failed to send OTP. Check your number and try again.',
        error: recipient,
      });
    }

    return res.send({ message: 'OTP sent successfully. Please use it to reset your password.' });
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    return handleError(error, res, 'Failed to send password reset OTP', 500);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  const { phoneNumber, otp, newPassword } = req.body;

  if (!phoneNumber || !otp || !newPassword) {
    return res.status(400).send({ message: 'Phone number, OTP, and new password are required!' });
  }

  if (otpStore[phoneNumber] !== otp) {
    return res.status(400).send({ message: 'Invalid or expired OTP.' });
  }

  delete otpStore[phoneNumber];

  try {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await User.updateOne({ phoneNumber }, { password: hashedPassword });
    return res.send({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    return handleError(error, res, 'Failed to reset password', 500);
  }
};

// Token Operation Functions
export const transferFunds = async (req: Request, res: Response): Promise<Response> => {
  const { toPhoneNumber, amount, tokenType = 'native', chain } = req.body;
  const user = req.user;

  if (!toPhoneNumber || !amount || !chain) {
    return res.status(400).send({ message: 'Recipient phone number, amount, and chain are required!' });
  }

  if (!['world', 'mantle', 'zksync'].includes(chain)) {
    return res.status(400).send({ message: "Invalid chain. Use 'world', 'mantle', or 'zksync'" });
  }

  try {
    const recipient = await User.findOne({ phoneNumber: toPhoneNumber });
    if (!recipient) return res.status(404).send({ message: 'Recipient not found!' });
    if (!user || !user._id) return res.status(401).send({ message: 'User not authenticated!' });

    const sender = await User.findById(user._id);
    if (!sender) return res.status(404).send({ message: 'Sender not found!' });

    if (sender.chain !== chain || recipient.chain !== chain) {
      return res.status(400).send({ message: 'Sender and recipient must be on the same chain for this transfer. Use cross-chain transfer instead.' });
    }

    const token = tokenType === 'USDC' && USDC_ADDRESSES[chain as Chain] ? 'USDC' : chain === 'world' ? 'WETH' : chain === 'mantle' ? 'MNT' : 'ETH';
    const txHash = `SIMULATED-TX-${chain}-${Date.now()}`; // Simulated transaction hash

    const transaction = new Transaction({
      from: sender.phoneNumber,
      to: recipient.phoneNumber,
      amount,
      token,
      chain,
      transactionHash: txHash,
      type: 'transfer',
    });
    await transaction.save();

    console.log(`✅ Simulated Transfer: ${amount} ${token} from ${sender.phoneNumber} to ${recipient.phoneNumber} on ${chain}`);
    return res.send({
      message: 'Transfer successful (simulated)!',
      from: sender.phoneNumber,
      to: recipient.phoneNumber,
      amount,
      token,
      chain,
      transactionHash: txHash,
    });
  } catch (error) {
    console.error('Failed to transfer funds:', error);
    return handleError(error, res, 'Failed to transfer funds', 500);
  }
};

export const getBalance = async (req: Request, res: Response): Promise<Response> => {
  const { chain, tokenType = 'native' } = req.body;
  const user = req.user;

  if (!chain || !user) {
    return res.status(400).send({ message: 'Chain and user authentication are required!' });
  }

  if (!['world', 'mantle', 'zksync'].includes(chain)) {
    return res.status(400).send({ message: "Invalid chain. Use 'world', 'mantle', or 'zksync'" });
  }

  try {
    const sender = await User.findById(user._id);
    if (!sender) return res.status(404).send({ message: 'User not found!' });

    const token = tokenType === 'USDC' && USDC_ADDRESSES[chain as Chain] ? 'USDC' : chain === 'world' ? 'WETH' : chain === 'mantle' ? 'MNT' : 'ETH';
    const balance = "1.0"; // Simulated balance for demo

    console.log(`✅ Simulated Balance for ${sender.phoneNumber}: ${balance} ${token} on ${chain}`);
    return res.send({
      message: 'Balance retrieved successfully (simulated)!',
      phoneNumber: sender.phoneNumber,
      walletAddress: sender.walletAddress,
      balance,
      token,
      chain,
    });
  } catch (error) {
    console.error('Failed to get balance:', error);
    return handleError(error, res, 'Failed to get balance', 500);
  }
};

export const transferCrossChain = async (req: Request, res: Response): Promise<Response> => {
  const { toPhoneNumber, amount, tokenType = 'native', fromChain, toChain } = req.body;
  const user = req.user;

  if (!toPhoneNumber || !amount || !fromChain || !toChain) {
    return res.status(400).send({ message: 'Recipient phone number, amount, fromChain, and toChain are required!' });
  }

  if (!['world', 'mantle', 'zksync'].includes(fromChain) || !['world', 'mantle', 'zksync'].includes(toChain)) {
    return res.status(400).send({ message: "Invalid chain. Use 'world', 'mantle', or 'zksync'" });
  }

  try {
    const recipient = await User.findOne({ phoneNumber: toPhoneNumber });
    if (!recipient) return res.status(404).send({ message: 'Recipient not found!' });
    if (!user || !user._id) return res.status(401).send({ message: 'User not authenticated!' });

    const sender = await User.findById(user._id);
    if (!sender) return res.status(404).send({ message: 'Sender not found!' });

    const token = tokenType === 'USDC' ? 'USDC' : fromChain === 'world' ? 'WETH' : fromChain === 'mantle' ? 'MNT' : 'ETH';
    const txHash = `SIMULATED-CROSS-CHAIN-TX-${fromChain}-to-${toChain}-${Date.now()}`;

    const transaction = new Transaction({
      from: sender.phoneNumber,
      to: recipient.phoneNumber,
      amount,
      token,
      chain: `${fromChain} -> ${toChain}`,
      transactionHash: txHash,
      type: 'crosschain',
    });
    await transaction.save();

    console.log(`✅ Simulated Cross-Chain Transfer: ${amount} ${token} from ${sender.phoneNumber} to ${recipient.phoneNumber} from ${fromChain} to ${toChain}`);
    return res.send({
      message: 'Cross-chain transfer successful (simulated)!',
      from: sender.phoneNumber,
      to: recipient.phoneNumber,
      amount,
      token,
      fromChain,
      toChain,
      transactionHash: txHash,
    });
  } catch (error) {
    console.error('Failed to process cross-chain transfer:', error);
    return handleError(error, res, 'Failed to process cross-chain transfer', 500);
  }
};