import { ThirdwebClient, createThirdwebClient, defineChain } from "thirdweb";
import { privateKeyToAccount, smartWallet } from "thirdweb/wallets";
import AfricasTalking from 'africastalking';
import { Wallet } from 'ethers';
import config from "../config/env";

// Thirdweb client setup
export const client: ThirdwebClient = createThirdwebClient({
    secretKey: config.THIRDWEB_SECRET_KEY as string,
});
console.log("Thirdweb client initialized with secret key:", config.THIRDWEB_SECRET_KEY ? "present" : "missing");

// Africa's Talking setup
export const africastalking = AfricasTalking({
    apiKey: config.AFRICAS_TALKING_API_KEY,
    username: 'NEXUSPAY', // Your app name; use 'sandbox' for testing
});
console.log("Africa's Talking initialized with API key:", config.AFRICAS_TALKING_API_KEY ? "present" : "missing");

export const SALT_ROUNDS = 10;

export const otpStore: Record<string, string> = {};

export const generateOTP = (): string => {
    let otp = '';
    for (let i = 0; i < 6; i++) {
        otp += Math.floor(Math.random() * 10).toString();
    }
    return otp;
};

export async function createAccount(chainName: string = "world") {
    const chainConfig = config[chainName];
    if (!chainConfig || !chainConfig.chainId) {
        throw new Error(`Invalid chain configuration for ${chainName}`);
    }

    const chain = defineChain(chainConfig.chainId);

    const newWallet = Wallet.createRandom();
    const pk = newWallet.privateKey;
    const personalAccount = privateKeyToAccount({
        client,
        privateKey: pk as string,
    });

    const wallet = smartWallet({
        chain,
        sponsorGas: false, // Set to true when paymaster is funded
    });

    const smartAccount = await wallet.connect({
        client,
        personalAccount,
    });
    const walletAddress = smartAccount.address;

    console.log(`Created account - Personal: ${personalAccount.address}, Smart: ${walletAddress}`);

    return { pk, walletAddress };
}