import { User } from '../models/models';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createAccount, generateOTP, otpStore, africastalking, SALT_ROUNDS } from '../services/auth';
import { handleError } from '../services/utils';
import config from '../config/env';

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
  const { phoneNumber, password, otp } = req.body;

  if (!phoneNumber || !password || !otp) {
    return res.status(400).send({ message: 'Phone number, password, and OTP are required!' });
  }

  if (!otpStore[phoneNumber] || otpStore[phoneNumber] !== otp) {
    return res.status(400).send({ message: 'Invalid or expired OTP.' });
  }

  delete otpStore[phoneNumber];

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userSmartAccount = await createAccount('world'); // Default to World chain
    const { pk, walletAddress } = userSmartAccount;

    const newUser = new User({
      phoneNumber,
      walletAddress,
      password: hashedPassword,
      privateKey: pk,
    });
    await newUser.save();

    const token = jwt.sign(
      { phoneNumber: newUser.phoneNumber, walletAddress: newUser.walletAddress },
      config.JWT_SECRET || 'zero',
      { expiresIn: '1h' }
    );

    return res.send({
      token,
      message: 'Registered successfully!',
      walletAddress: newUser.walletAddress,
      phoneNumber: newUser.phoneNumber,
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
      { phoneNumber: user.phoneNumber, walletAddress: user.walletAddress },
      config.JWT_SECRET || 'zero',
      { expiresIn: '1h' }
    );

    return res.send({
      token,
      message: 'Logged in successfully!',
      walletAddress: user.walletAddress,
      phoneNumber: user.phoneNumber,
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