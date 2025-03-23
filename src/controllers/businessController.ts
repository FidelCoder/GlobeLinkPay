import { Request, Response } from 'express';
import { Business } from '../models/businessModel';
import { User } from '../models/models';
import { Transaction } from '../models/transactionModel';
import { createAccount, generateOTP, otpStore, africastalking } from '../services/auth';
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

// Utility: Generate Unique Merchant ID
function generateMerchantId(): string {
  const timestamp = Date.now().toString().slice(-5);
  const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
  return `NX-${timestamp}${randomDigits}`;
}

export const requestBusinessCreation = async (req: Request, res: Response): Promise<Response> => {
  const { businessName, ownerName, phoneNumber, email, location, businessType } = req.body;
  const user = req.user;

  if (!user || !businessName || !ownerName || !phoneNumber || !email || !location || !businessType) {
    return res.status(400).send({ message: 'User authentication and all business fields are required!' });
  }

  try {
    const existingBusiness = await Business.findOne({ userId: user._id, businessName });
    if (existingBusiness) {
      return res.status(409).send({ message: 'A business with this name already exists for this user.' });
    }

    const otp = generateOTP();
    otpStore[user.phoneNumber] = otp;

    console.log(`✅ Business Creation OTP for ${user.phoneNumber}: ${otp}`);

    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const smsResponse = await africastalking.SMS.send({
      to: [formattedPhoneNumber],
      message: `Your OTP to create ${businessName} is: ${otp}`,
      from: 'NEXUSPAY',
    });

    console.log('📨 SMS Response:', JSON.stringify(smsResponse, null, 2));
    return res.send({ message: 'OTP sent successfully to your registered phone number. Please verify to complete business creation.' });
  } catch (error) {
    console.error('❌ Error in business creation request:', error);
    return handleError(error, res, 'Failed to process business creation request', 500);
  }
};

export const completeBusinessCreation = async (req: Request, res: Response): Promise<Response> => {
  const { businessName, ownerName, phoneNumber, email, location, businessType, otp, chain = 'world' } = req.body;
  const user = req.user;

  if (!user || !businessName || !ownerName || !phoneNumber || !email || !location || !businessType || !otp) {
    return res.status(400).send({ message: 'User authentication, OTP, and all business fields are required!' });
  }

  if (!['world', 'mantle', 'zksync'].includes(chain)) {
    return res.status(400).send({ message: "Invalid chain. Use 'world', 'mantle', or 'zksync'." });
  }

  if (!otpStore[user.phoneNumber] || otpStore[user.phoneNumber] !== otp) {
    return res.status(400).send({ message: 'Invalid or expired OTP.' });
  }
  delete otpStore[user.phoneNumber];

  try {
    const existingBusiness = await Business.findOne({ userId: user._id, businessName });
    if (existingBusiness) {
      return res.status(409).send({ message: 'A business with this name already exists for this user.' });
    }

    const { pk, walletAddress } = await createAccount(chain);
    const merchantId = generateMerchantId();

    const business = new Business({
      businessName,
      ownerName,
      phoneNumber,
      email,
      location,
      businessType,
      merchantId,
      walletAddress,
      privateKey: pk,
      userId: user._id,
      uniqueCode: merchantId,
      chain,
    });

    await business.save();

    return res.send({
      message: 'Business created successfully!',
      walletAddress,
      merchantId,
      uniqueCode: merchantId,
      chain,
      businessDetails: { businessName, ownerName, phoneNumber, email, location, businessType },
    });
  } catch (error) {
    console.error('❌ Error in completing business creation:', error);
    return handleError(error, res, 'Failed to create business', 500);
  }
};

export const transferFundsToPersonal = async (req: Request, res: Response): Promise<Response> => {
  const { businessId, amount, chain, tokenType = 'native', otp } = req.body;
  const user = req.user;

  if (!user || !businessId || !amount || !chain || !otp) {
    return res.status(400).send({ message: 'User authentication, business ID, amount, chain, and OTP are required!' });
  }

  if (!['world', 'mantle', 'zksync'].includes(chain)) {
    return res.status(400).send({ message: "Unsupported chain! Use 'world', 'mantle', or 'zksync'." });
  }

  if (!otpStore[user.phoneNumber] || otpStore[user.phoneNumber] !== otp) {
    return res.status(400).send({ message: 'Invalid or expired OTP.' });
  }
  delete otpStore[user.phoneNumber];

  try {
    const business = await Business.findById(businessId);
    if (!business || business.userId.toString() !== user._id.toString()) {
      return res.status(404).send({ message: 'Business not found or not owned by user.' });
    }

    if ((business.chain || 'world') !== chain) {
      return res.status(400).send({ message: 'Business wallet is not on the specified chain!' });
    }

    const sender = await User.findById(user._id);
    if (!sender) return res.status(404).send({ message: 'User not found!' });

    const token = tokenType === 'USDC' && USDC_ADDRESSES[chain as Chain] ? 'USDC' : chain === 'world' ? 'WETH' : chain === 'mantle' ? 'MNT' : 'ETH';
    const txHash = `SIMULATED-TX-${chain}-${Date.now()}`; // Simulated transaction hash

    const transaction = new Transaction({
      from: business.businessName,
      to: sender.phoneNumber,
      amount,
      token,
      chain,
      transactionHash: txHash,
      type: 'transfer',
    });
    await transaction.save();

    console.log(`✅ Simulated Business-to-Personal Transfer: ${amount} ${token} from ${business.businessName} to ${sender.phoneNumber} on ${chain}`);
    return res.send({
      message: 'Funds transferred successfully (simulated)!',
      from: business.businessName,
      to: sender.phoneNumber,
      amount,
      token,
      chain,
      transactionHash: txHash,
    });
  } catch (error) {
    console.error('❌ Error transferring funds:', error);
    return handleError(error, res, 'Failed to transfer funds', 500);
  }
};

export const payBusiness = async (req: Request, res: Response): Promise<Response> => {
  const { merchantId, amount, tokenType = 'native', chain } = req.body;
  const user = req.user;

  if (!merchantId || !amount || !chain) {
    return res.status(400).send({ message: 'Merchant ID, amount, and chain are required!' });
  }

  if (!['world', 'mantle', 'zksync'].includes(chain)) {
    return res.status(400).send({ message: "Invalid chain. Use 'world', 'mantle', or 'zksync'." });
  }

  try {
    const business = await Business.findOne({ merchantId });
    if (!business) return res.status(404).send({ message: 'Business not found!' });
    if (!user || !user._id) return res.status(401).send({ message: 'User not authenticated!' });

    const sender = await User.findById(user._id);
    if (!sender) return res.status(404).send({ message: 'Sender not found!' });

    if ((sender.chain || 'world') !== chain || (business.chain || 'world') !== chain) {
      return res.status(400).send({ message: 'Sender and business wallets must be on the same chain!' });
    }

    const token = tokenType === 'USDC' && USDC_ADDRESSES[chain as Chain] ? 'USDC' : chain === 'world' ? 'WETH' : chain === 'mantle' ? 'MNT' : 'ETH';
    const txHash = `SIMULATED-TX-${chain}-${Date.now()}`; // Simulated transaction hash

    const transaction = new Transaction({
      from: sender.phoneNumber,
      to: business.businessName,
      amount,
      token,
      chain,
      transactionHash: txHash,
      type: 'payment',
    });
    await transaction.save();

    console.log(`✅ Simulated Payment: ${amount} ${token} from ${sender.phoneNumber} to ${business.businessName} on ${chain}`);
    return res.send({
      message: 'Payment successful (simulated)!',
      from: sender.phoneNumber,
      to: business.businessName,
      amount,
      token,
      merchantId,
      chain,
      transactionHash: txHash,
    });
  } catch (error) {
    console.error('❌ Error paying business:', error);
    return handleError(error, res, 'Failed to pay business', 500);
  }
};

export const getBusinessBalance = async (req: Request, res: Response): Promise<Response> => {
  const { businessId, chain, tokenType = 'native' } = req.body;
  const user = req.user;

  if (!businessId || !chain || !user) {
    return res.status(400).send({ message: 'Business ID, chain, and user authentication are required!' });
  }

  if (!['world', 'mantle', 'zksync'].includes(chain)) {
    return res.status(400).send({ message: "Invalid chain. Use 'world', 'mantle', or 'zksync'." });
  }

  try {
    const business = await Business.findById(businessId);
    if (!business || business.userId.toString() !== user._id.toString()) {
      return res.status(404).send({ message: 'Business not found or not owned by user.' });
    }

    if ((business.chain || 'world') !== chain) {
      return res.status(400).send({ message: 'Business wallet is not on the specified chain!' });
    }

    const token = tokenType === 'USDC' && USDC_ADDRESSES[chain as Chain] ? 'USDC' : chain === 'world' ? 'WETH' : chain === 'mantle' ? 'MNT' : 'ETH';
    const balance = "2.0"; // Simulated balance for demo

    console.log(`✅ Simulated Business Balance for ${business.businessName}: ${balance} ${token} on ${chain}`);
    return res.send({
      message: 'Balance retrieved successfully (simulated)!',
      businessName: business.businessName,
      walletAddress: business.walletAddress,
      balance,
      token,
      chain,
    });
  } catch (error) {
    console.error('❌ Error retrieving business balance:', error);
    return handleError(error, res, 'Failed to get business balance', 500);
  }
};