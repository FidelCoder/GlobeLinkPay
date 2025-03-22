import { Request, Response } from 'express';
import { User } from '../models/models';
import { Business } from '../models/businessModel';
import { ethers } from 'ethers';
import { africastalking, client } from '../services/auth';
import { sendToken, getAllTokenTransferEvents, unifyWallets } from '../services/token';
import { Chain } from '../types/token';
import { defineChain, getContract, readContract } from "thirdweb";
import config from '../config/env';
import * as bcrypt from 'bcrypt';

export const send = async (req: Request, res: Response) => {
    const { recipientIdentifier, amount, senderAddress, chain } = req.body;
    if (!recipientIdentifier || !amount || !senderAddress || !chain) {
        console.log("Send request failed: Missing required parameters");
        return res.status(400).send({ message: "Required parameters are missing!" });
    }
    
    console.log("Received send request:", { amount, senderAddress, recipientIdentifier, chain });

    let recipientAddress = recipientIdentifier;
    let recipientPhone = '';

    try {
        const sender = await User.findOne({ walletAddress: senderAddress });
        if (!sender) {
            console.error("Sender not found for address:", senderAddress);
            return res.status(404).send({ message: "Sender wallet not found!" });
        }

        if (!ethers.utils.isAddress(recipientIdentifier)) {
            const recipient = await User.findOne({ phoneNumber: recipientIdentifier });
            if (!recipient) {
                console.log("Recipient not found for phoneNumber:", recipientIdentifier);
                return res.status(404).send({ message: "Recipient not found!" });
            }
            recipientAddress = recipient.walletAddress;
            recipientPhone = recipient.phoneNumber;
        }

        if (!['world', 'mantle', 'zksync'].includes(chain)) {
            console.log("Invalid chain:", chain);
            return res.status(400).send({ message: "Unsupported chain! Use 'world', 'mantle', or 'zksync'." });
        }

        console.log("Sending token with params:", {
            recipientAddress,
            amount,
            chain,
            senderPrivateKey: sender.privateKey ? "exists" : "missing"
        });

        if (!sender.privateKey) {
            console.log("Sender private key missing for:", senderAddress);
            return res.status(400).send({ message: "Sender private key not found in database!" });
        }

        const result = await sendToken(recipientAddress, amount, chain, sender.privateKey);

        const currentDateTime = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
        const transactionCode = Math.random().toString(36).substring(2, 12).toUpperCase();
        const amountDisplay = `${amount} USDC`;

        if (recipientPhone) {
            await africastalking.SMS.send({
                to: recipientPhone,
                message: `${transactionCode} Confirmed. ${amountDisplay} received from ${sender.phoneNumber} on ${currentDateTime}`,
                from: 'NEXUSPAY'
            });
            console.log(`SMS sent to recipient: ${recipientPhone}`);
        }

        await africastalking.SMS.send({
            to: sender.phoneNumber,
            message: `${transactionCode} Confirmed. ${amountDisplay} sent to ${recipientPhone || recipientAddress} on ${currentDateTime}`,
            from: 'NEXUSPAY'
        });
        console.log(`SMS sent to sender: ${sender.phoneNumber}`);

        res.send({ 
            message: 'Token sent successfully!',
            transactionCode,
            amount: amountDisplay,
            recipient: recipientPhone || recipientAddress,
            timestamp: currentDateTime,
            transactionHash: result.transactionHash
        });

    } catch (error: any) {
        console.error("Error in send API:", error);
        res.status(500).send({ 
            message: 'Failed to send token.', 
            error: error.message || 'Unknown error occurred'
        });
    }
};

export const pay = async (req: Request, res: Response) => {
    const { senderAddress, businessUniqueCode, amount, confirm, chain } = req.body;
    if (!businessUniqueCode || !amount || !senderAddress) {
        console.log("Pay request failed: Missing required parameters");
        return res.status(400).send({ message: "Required parameters are missing!" });
    }

    const sender = await User.findOne({ walletAddress: senderAddress });
    const business = await Business.findOne({ uniqueCode: businessUniqueCode });
    if (!business) {
        console.log("Business not found for uniqueCode:", businessUniqueCode);
        return res.status(404).send({ message: "Business not found!" });
    }
    if (!sender) {
        console.log("Sender not found for address:", senderAddress);
        return res.status(404).send({ message: "Sender not found!" });
    }

    if (!confirm) {
        console.log("Payment confirmation required for:", businessUniqueCode);
        return res.status(200).send({
            message: "Please confirm the payment to the business.",
            businessName: business.businessName
        });
    }

    try {
        if (!sender.privateKey) {
            console.log("Sender private key missing for:", senderAddress);
            return res.status(400).send({ message: "Sender private key not found in database!" });
        }

        const result = await sendToken(business.walletAddress, amount, chain || 'world', sender.privateKey);
        console.log(`Payment successful to ${business.walletAddress}: ${result.transactionHash}`);
        res.send({ 
            message: 'Token sent successfully to the business!', 
            paid: true, 
            transactionHash: result.transactionHash 
        });
    } catch (error: any) {
        console.error("Error in pay API:", error);
        res.status(500).send({ 
            message: 'Failed to send token.', 
            error: error.message || 'Unknown error occurred' 
        });
    }
};

export const tokenTransferEvents = async (req: Request, res: Response) => {
    const { address, chain } = req.query;

    if (!address) {
        console.log("Token transfer events request failed: Address missing");
        return res.status(400).send('Address is required as a query parameter.');
    }

    if (!chain) {
        console.log("Token transfer events request failed: Chain missing");
        return res.status(400).send('Chain is required as a query parameter.');
    }

    if (!['world', 'mantle', 'zksync'].includes(chain as string)) {
        console.log("Invalid chain for token transfer events:", chain);
        return res.status(400).send("Invalid chain parameter. Supported chains are 'world', 'mantle', 'zksync'.");
    }

    try {
        const events = await getAllTokenTransferEvents(chain as Chain, address as string);
        console.log(`Fetched token transfer events for ${address} on ${chain}`);
        res.json(events);
    } catch (error: any) {
        console.error('Error fetching token transfer events:', error);
        res.status(500).send({ 
            message: 'Internal server error', 
            error: error.message || 'Unknown error occurred' 
        });
    }
};

export const unify = async (req: Request, res: Response) => {
    const { phoneNumber, password, otp } = req.body;

    if (!phoneNumber) {
        console.log("Unify request failed: Phone number missing");
        return res.status(400).send({ message: "Phone number is required." });
    }

    try {
        console.log(`Unifying wallets for phoneNumber: ${phoneNumber}`);

        const user = await User.findOne({ phoneNumber });
        if (!user) {
            console.log(`User not found for phoneNumber: ${phoneNumber}`);
            return res.status(404).send({ message: "Phone number not registered." });
        }

        const status = {
            phoneNumberExists: true,
            isLocked: user.lockoutUntil && Date.now() < user.lockoutUntil,
            failedAttempts: user.failedPasswordAttempts,
            isUnified: user.isUnified,
        };
        console.log(`User status for ${phoneNumber}:`, status);

        if (user.isUnified) {
            console.log(`Wallets already unified for ${phoneNumber}. Current wallet: ${user.walletAddress}`);
            return res.status(200).send({
                message: "Wallets have already been unified.",
                unifiedWalletAddress: user.walletAddress,
            });
        }

        if (status.isLocked) {
            const timeLeft = Math.ceil((user.lockoutUntil! - Date.now()) / (1000 * 60));
            console.log(`User locked out until: ${new Date(user.lockoutUntil!).toISOString()}`);
            return res.status(429).send({
                message: `Too many failed attempts. Please try again in ${timeLeft} minutes using OTP or password.`,
            });
        }

        if (!otp) {
            if (!password) {
                console.log(`No password provided for ${phoneNumber}, prompting OTP`);
                const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
                console.log(`Generated OTP: ${generatedOtp} for ${phoneNumber}`);

                try {
                    const smsResponse = await africastalking.SMS.send({
                        to: phoneNumber,
                        message: `Your unification OTP is ${generatedOtp}. Valid for 5 minutes.`,
                        from: 'NEXUSPAY'
                    });
                    console.log(`SMS sent successfully to ${phoneNumber}:`, smsResponse);
                } catch (smsError) {
                    console.error(`Failed to send SMS to ${phoneNumber}:`, smsError);
                    return res.status(500).send({ message: "Failed to send OTP. Please try again." });
                }

                user.tempOtp = generatedOtp;
                user.otpExpires = Date.now() + 5 * 60 * 1000;
                await user.save();
                console.log(`OTP saved for ${phoneNumber}, expires at: ${new Date(user.otpExpires!).toISOString()}`);
                return res.status(200).send({ message: "OTP sent to your phone. Please provide it to proceed." });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                user.failedPasswordAttempts += 1;
                console.log(`Incorrect password for ${phoneNumber}. Attempts: ${user.failedPasswordAttempts}`);

                if (user.failedPasswordAttempts >= 5) {
                    user.lockoutUntil = Date.now() + 60 * 60 * 1000;
                    user.failedPasswordAttempts = 0;
                    await user.save();
                    console.log(`User locked out until: ${new Date(user.lockoutUntil!).toISOString()}`);
                    return res.status(429).send({
                        message: "Too many failed attempts. Please try again in 1 hour using OTP or password.",
                    });
                }

                await user.save();
                return res.status(401).send({
                    message: "Incorrect password. Please verify your password or use OTP instead.",
                    attempts: user.failedPasswordAttempts,
                });
            }

            user.failedPasswordAttempts = 0;
            await user.save();
            console.log(`Password authenticated for ${phoneNumber}`);
        } else {
            if (user.tempOtp !== otp || !user.otpExpires || Date.now() > user.otpExpires) {
                console.log(`OTP validation failed for ${phoneNumber}: tempOtp=${user.tempOtp}, otp=${otp}, expires=${user.otpExpires}`);
                return res.status(400).send({ message: "Invalid or expired OTP." });
            }
            console.log(`OTP validated successfully for ${phoneNumber}`);
        }

        const unifiedAddress = await unifyWallets(user.privateKey);
        console.log(`Unified address generated: ${unifiedAddress}`);

        user.walletAddress = unifiedAddress;
        user.isUnified = true;
        user.tempOtp = undefined;
        user.otpExpires = undefined;
        await user.save();
        console.log(`User updated with unified address: ${unifiedAddress}, marked as unified`);

        res.send({
            message: "Wallets unified successfully!",
            unifiedWalletAddress: unifiedAddress,
        });

    } catch (error: any) {
        console.error(`Error in unify API for ${phoneNumber}:`, error);
        res.status(500).send({
            message: "Failed to unify wallets.",
            error: error.message || "Unknown error occurred",
        });
    }
};

export const getWallet = async (req: Request, res: Response) => {
    const { phoneNumber } = req.query;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
        console.log("Get wallet request failed: Phone number missing or invalid");
        return res.status(400).send({ message: "Phone number is required as a query parameter." });
    }

    try {
        console.log(`Fetching wallet details for phoneNumber (raw): ${phoneNumber}`);
        const normalizedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
        console.log(`Fetching wallet details for phoneNumber (normalized): ${normalizedPhoneNumber}`);

        const user = await User.findOne({ phoneNumber: normalizedPhoneNumber });
        if (!user) {
            console.log(`User not found for phoneNumber: ${normalizedPhoneNumber}`);
            return res.status(404).send({ message: "Phone number not registered." });
        }

        const walletDetails = {
            phoneNumber: user.phoneNumber,
            unifiedWalletAddress: user.walletAddress,
            isUnified: user.isUnified,
        };
        console.log(`Wallet details for ${normalizedPhoneNumber}:`, walletDetails);

        const balances: { [key: string]: number } = {};
        const chains = [
            { name: 'world', chainId: config.world.chainId, tokenAddress: config.world.tokenAddress },
            { name: 'mantle', chainId: config.mantle.chainId, tokenAddress: config.mantle.tokenAddress },
            { name: 'zksync', chainId: config.zksync.chainId, tokenAddress: config.zksync.tokenAddress },
        ];

        for (const chain of chains) {
            try {
                console.log(`Fetching balance for ${chain.name} - Chain ID: ${chain.chainId}, Token Address: ${chain.tokenAddress}`);
                const contract = getContract({
                    client,
                    chain: defineChain(chain.chainId),
                    address: chain.tokenAddress,
                });
                const balance = await readContract({
                    contract,
                    method: "function balanceOf(address) view returns (uint256)",
                    params: [user.walletAddress],
                });
                console.log(`Raw balance on ${chain.name} for ${user.walletAddress}: ${balance}`);
                const decimals = 6;
                const balanceInUSDC = Number(balance) / 10 ** decimals;
                balances[chain.name] = balanceInUSDC;
                console.log(`Balance on ${chain.name} for ${user.walletAddress}: ${balanceInUSDC} USDC`);
            } catch (error: any) {
                console.error(`Failed to fetch balance on ${chain.name} for ${normalizedPhoneNumber}:`, {
                    errorMessage: error.message,
                    errorDetails: error.shortMessage || error.details,
                    chainId: chain.chainId,
                    tokenAddress: chain.tokenAddress,
                });
                balances[chain.name] = 0;
                console.log(`Set balance on ${chain.name} to 0 due to fetch error`);
            }
        }

        res.send({
            message: "Wallet details retrieved successfully",
            wallet: {
                ...walletDetails,
                balances,
            },
        });

    } catch (error: any) {
        console.error(`Error in getWallet API for ${phoneNumber}:`, error);
        res.status(500).send({
            message: "Failed to retrieve wallet details.",
            error: error.message || "Unknown error occurred",
        });
    }
};