import { Request, Response } from 'express';
import { Business } from '../models/businessModel';
import { User } from '../models/models';
import { createAccount, generateOTP, otpStore, africastalking } from '../services/auth';
import { sendToken } from '../services/token'; // Import sendToken for transfers
import { handleError } from '../services/utils';
import config from '../config/env';

// Utility: Generate Unique Merchant ID (Borderless Till Number)
function generateMerchantId(): string {
  const timestamp = Date.now().toString().slice(-5);
  const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
  return `NX-${timestamp}${randomDigits}`;
}

export const requestBusinessCreation = async (req: Request, res: Response): Promise<Response> => {
  const { userId, businessName, ownerName, location, businessType, phoneNumber } = req.body;

  if (!userId || !businessName || !ownerName || !location || !businessType || !phoneNumber) {
    return res.status(400).send({ message: 'All fields are required!' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found. Please create a personal account first.' });
    }

    const existingBusiness = await Business.findOne({ userId, businessName });
    if (existingBusiness) {
      return res.status(409).send({ message: 'A business with this name already exists for this user.' });
    }

    const otp = generateOTP();
    otpStore[phoneNumber] = otp;

    console.log(`✅ Business Creation OTP for ${phoneNumber}: ${otp}`);

    await africastalking.SMS.send({
      to: [phoneNumber],
      message: `Your business creation verification code is: ${otp}`,
      from: 'NEXUSPAY',
    });

    return res.send({ message: 'OTP sent successfully. Please verify to complete business creation.' });
  } catch (error) {
    console.error('❌ Error in business creation request:', error);
    return handleError(error, res, 'Failed to process business creation request.');
  }
};

export const completeBusinessCreation = async (req: Request, res: Response): Promise<Response> => {
  const { userId, phoneNumber, otp, businessName, ownerName, location, businessType } = req.body;

  if (!userId || !phoneNumber || !otp || !businessName || !ownerName || !location || !businessType) {
    return res.status(400).send({ message: 'All fields are required!' });
  }

  if (!otpStore[phoneNumber] || otpStore[phoneNumber] !== otp) {
    return res.status(400).send({ message: 'Invalid or expired OTP.' });
  }
  delete otpStore[phoneNumber];

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: 'User not found. Please create a personal account first.' });
    }

    const { pk, walletAddress } = await createAccount('world'); // Unified wallet
    const merchantId = generateMerchantId();

    const business = new Business({
      businessName,
      ownerName,
      location,
      businessType,
      phoneNumber,
      merchantId,
      walletAddress,
      privateKey: pk,
      userId: user._id,
    });

    await business.save();

    return res.send({
      message: 'Business created successfully!',
      walletAddress,
      merchantId,
    });
  } catch (error) {
    console.error('❌ Error in completing business creation:', error);
    return res.status(500).send({ message: 'Failed to create business.' });
  }
};

export const transferFundsToPersonal = async (req: Request, res: Response): Promise<Response> => {
  const { businessId, amount, otp, chain } = req.body;

  if (!businessId || !amount || !otp || !chain) {
    return res.status(400).send({ message: 'Business ID, amount, OTP, and chain are required!' });
  }

  if (!['world', 'mantle', 'zksync'].includes(chain)) {
    return res.status(400).send({ message: "Unsupported chain! Use 'world', 'mantle', or 'zksync'." });
  }

  const business = await Business.findById(businessId);
  if (!business) {
    return res.status(404).send({ message: 'Business account not found.' });
  }

  const user = await User.findById(business.userId);
  if (!user) {
    return res.status(404).send({ message: 'User account not found.' });
  }

  if (!otpStore[user.phoneNumber] || otpStore[user.phoneNumber] !== otp) {
    return res.status(400).send({ message: 'Invalid or expired OTP.' });
  }
  delete otpStore[user.phoneNumber];

  try {
    const result = await sendToken(user.walletAddress, amount, chain, business.privateKey);
    console.log(`✅ Business-to-Personal Transfer: ${result.transactionHash}`);

    return res.send({
      message: 'Funds transferred successfully!',
      transactionHash: result.transactionHash,
    });
  } catch (error) {
    console.error('❌ Error transferring funds:', error);
    return res.status(500).send({ message: 'Failed to transfer funds.' });
  }
};