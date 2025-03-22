import { Request, Response } from 'express';
import { User } from '../models/models';
import { initiateB2C, initiateSTKPush } from '../services/mpesa';
import { getConversionRateWithCaching, sendToken } from '../services/token';
import config from '../config/env';

export const mpesaDeposit = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { amount, phone, chain } = req.body;
    const user = req.user; // From authenticateToken middleware

    if (!amount || !phone || !chain || !user) {
      return res.status(400).send({ message: 'Amount, phone, chain, and user authentication are required' });
    }

    if (!['world', 'mantle', 'zksync'].includes(chain)) {
      return res.status(400).send({ message: "Invalid chain. Use 'world', 'mantle', or 'zksync'" });
    }

    console.log('Initiating STK Push for phone:', phone);

    const queryData = await initiateSTKPush(
      phone,
      config.MPESA_SHORTCODE!,
      amount,
      `Deposit-${Date.now()}`,
      user.phoneNumber
    );

    if (!queryData || queryData.ResultCode !== '0') {
      return res.status(400).json({ message: 'MPESA transaction unsuccessful', details: queryData });
    }

    const conversionRate = await getConversionRateWithCaching();
    const convertedAmount = parseFloat(amount) / conversionRate;

    const tx = await sendToken(
      user.walletAddress,
      convertedAmount,
      chain,
      config.PLATFORM_WALLET_PRIVATE_KEY!
    );

    return res.json({
      message: 'Deposit and swap conducted successfully',
      transactionHash: tx.transactionHash,
      mpesaResult: queryData,
    });
  } catch (error: any) {
    console.error('Error in mpesaDeposit:', error.message);
    return res.status(500).send({ message: 'Deposit failed', details: error.message });
  }
};

export const mpesaWithdraw = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { amount, chain } = req.body;
    const user = req.user;

    if (!amount || !chain || !user) {
      return res.status(400).send({ message: 'Amount, chain, and user authentication are required' });
    }

    if (!['world', 'mantle', 'zksync'].includes(chain)) {
      return res.status(400).send({ message: "Invalid chain. Use 'world', 'mantle', or 'zksync'" });
    }

    const conversionRate = await getConversionRateWithCaching();
    const convertedAmount = parseFloat(amount) / conversionRate;

    console.log('Withdrawing for user:', user.phoneNumber);

    // Transfer USDC from user to platform wallet
    const tx = await sendToken(
      config.PLATFORM_WALLET_ADDRESS!,
      convertedAmount,
      chain,
      user.privateKey!
    );

    // Initiate B2C withdrawal (removing country code '254' from phone number)
    const receiver = parseInt(user.phoneNumber.replace(/^254/, ''));
    const b2cResult = await initiateB2C(amount, receiver);

    if (!b2cResult || b2cResult.ResponseCode !== '0') {
      return res.status(400).send({ message: 'B2C withdrawal failed', details: b2cResult });
    }

    return res.json({
      message: 'Withdrawal successful',
      transactionHash: tx.transactionHash,
      mpesaResult: b2cResult,
    });
  } catch (error: any) {
    console.error('Error in mpesaWithdraw:', error.message);
    return res.status(500).send({ message: 'Withdrawal failed', details: error.message });
  }
};

export const mpesaSTKPushWebhook = (req: Request, res: Response): Response => {
  console.log('-----------------Received STK Push Webhook--------------------');
  console.log(req.body);
  console.log('-----------------------');

  const message = {
    ResponseCode: '00000000',
    ResponseDesc: 'success',
  };

  return res.json(message);
};

export const mpesaB2CWebhook = (req: Request, res: Response): Response => {
  console.log('---------------Safaricom B2C Result----------------');
  console.log(req.body);
  console.log('-----------------------------------------');

  const resultParameter: Array<any> = req.body.Result?.ResultParameters?.ResultParameter || [];
  const amountSent = resultParameter[0]?.Value || 'unknown';

  console.log('Amount sent:', amountSent);

  return res.json(req.body);
};

export const mpesaQueueWebhook = (req: Request, res: Response): Response => {
  console.log('---------------Queue Timeout-------------');
  console.log(req.body);
  console.log('-----------------------------------------');

  const message = {
    Timeout: true,
  };
  return res.json(message);
};