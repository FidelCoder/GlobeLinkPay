import { Request, Response } from 'express';
import { Business } from '../models/businessModel';
import { User } from '../models/models';
import { createAccount, generateOTP, otpStore, africastalking } from '../services/auth';
import { sendToken } from '../services/token';
import { handleError } from '../services/utils';
import config from '../config/env';

// Utility: Generate Unique Merchant ID (Borderless Till Number)
function generateMerchantId(): string {
  const timestamp = Date.now().toString().slice(-5);
  const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
  return `NX-${timestamp}${randomDigits}`;
}

export const requestBusinessCreation = async (req: Request, res: Response): Promise<Response> => {
  const { businessName, ownerName, phoneNumber, email, location, businessType } = req.body;
  const user = req.user; // From authenticateToken middleware

  if (!user || !businessName || !ownerName || !phoneNumber || !email || !location || !businessType) {
    return res.status(400).send({ message: 'User authentication and all business fields (businessName, ownerName, phoneNumber, email, location, businessType) are required!' });
  }

  try {
    const existingBusiness = await Business.findOne({ userId: user._id, businessName });
    if (existingBusiness) {
      return res.status(409).send({ message: 'A business with this name already exists for this user.' });
    }

    // Generate OTP for verification
    const otp = generateOTP();
    otpStore[user.phoneNumber] = otp; // Use user's phoneNumber for OTP storage

    console.log(`✅ Business Creation OTP for ${user.phoneNumber}: ${otp}`);

    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    await africastalking.SMS.send({
      to: [formattedPhoneNumber],
      message: `Your OTP to create ${businessName} is: ${otp}`,
      from: 'NEXUSPAY',
    });

    return res.send({ message: 'OTP sent successfully to your registered phone number. Please verify to complete business creation.' });
  } catch (error) {
    console.error('❌ Error in business creation request:', error);
    return handleError(error, res, 'Failed to process business creation request.');
  }
};

export const completeBusinessCreation = async (req: Request, res: Response): Promise<Response> => {
  const { businessName, ownerName, phoneNumber, email, location, businessType, otp } = req.body;
  const user = req.user;

  if (!user || !businessName || !ownerName || !phoneNumber || !email || !location || !businessType || !otp) {
    return res.status(400).send({ message: 'User authentication, OTP, and all business fields (businessName, ownerName, phoneNumber, email, location, businessType) are required!' });
  }

  if (!otpStore[user.phoneNumber] || otpStore[user.phoneNumber] !== otp) {
    return res.status(400).send({ message: 'Invalid or expired OTP.' });
  }
  delete otpStore[user.phoneNumber]; // Clear OTP after verification

  try {
    const existingBusiness = await Business.findOne({ userId: user._id, businessName });
    if (existingBusiness) {
      return res.status(409).send({ message: 'A business with this name already exists for this user.' });
    }

    // Create Business Wallet (default to World chain)
    const { pk, walletAddress } = await createAccount('world');
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
      uniqueCode: merchantId, // For tokenController compatibility
    });

    await business.save();

    return res.send({
      message: 'Business created successfully!',
      walletAddress,
      merchantId,
      uniqueCode: merchantId,
      businessDetails: { businessName, ownerName, phoneNumber, email, location, businessType },
    });
  } catch (error) {
    console.error('❌ Error in completing business creation:', error);
    return handleError(error, res, 'Failed to create business.');
  }
};

export const transferFundsToPersonal = async (req: Request, res: Response): Promise<Response> => {
  const { businessId, amount, chain, otp } = req.body;
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
  delete otpStore[user.phoneNumber]; // Clear OTP after verification

  try {
    const business = await Business.findById(businessId);
    if (!business || business.userId.toString() !== user._id.toString()) {
      return res.status(404).send({ message: 'Business not found or not owned by user.' });
    }

    const result = await sendToken(user.walletAddress, amount, chain, business.privateKey);
    console.log(`✅ Business-to-Personal Transfer: ${result.transactionHash}`);

    return res.send({
      message: 'Funds transferred successfully!',
      transactionHash: result.transactionHash,
      amount,
      chain,
    });
  } catch (error) {
    console.error('❌ Error transferring funds:', error);
    return handleError(error, res, 'Failed to transfer funds.');
  }
};