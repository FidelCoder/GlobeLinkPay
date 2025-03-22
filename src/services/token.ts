import { Chain } from '../types/token';
import { TokenTransferEvent } from '../types/token';
import { client } from './auth';
import { privateKeyToAccount, smartWallet } from "thirdweb/wallets";
import { defineChain, getContract, sendTransaction, waitForReceipt, readContract } from "thirdweb";
import { transfer, approve, allowance } from "thirdweb/extensions/erc20";
import config from "../config/env";
import { keccak256, toHex } from "thirdweb/utils";

export function calculateTransactionFee(amount: number): number {
    if (amount <= 1) return 0;
    if (amount <= 5) return 0.05;
    if (amount <= 10) return 0.1;
    if (amount <= 15) return 0.2;
    if (amount <= 25) return 0.3;
    if (amount <= 35) return 0.45;
    if (amount <= 50) return 0.5;
    if (amount <= 75) return 0.68;
    if (amount <= 100) return 0.79;
    if (amount <= 150) return 0.88;
    return 0.95;
}

export async function sendToken(
    recipientAddress: string,
    amount: number,
    chainName: string,
    pk: string
): Promise<{ transactionHash: string }> {
    try {
        if (!recipientAddress || !amount || amount <= 0 || !pk) {
            throw new Error("Invalid input parameters: recipientAddress, amount, and privateKey are required.");
        }

        const chainConfig = config[chainName];
        if (!chainConfig || !chainConfig.chainId || !chainConfig.tokenAddress) {
            throw new Error(`Invalid chain configuration for ${chainName}`);
        }

        const chain = defineChain(chainConfig.chainId);
        console.log(`Chain ID for ${chainName}: ${chainConfig.chainId}`);
        const tokenAddress = chainConfig.tokenAddress;
        console.log(`Token address for ${chainName}: ${tokenAddress}`);

        const personalAccount = privateKeyToAccount({ client, privateKey: pk });
        console.log("Personal account address:", personalAccount.address);

        const wallet = smartWallet({
            chain,
            sponsorGas: false, // Set to true when paymaster is funded
        });

        const smartAccount = await wallet.connect({ client, personalAccount });
        console.log("Smart account address:", smartAccount.address);

        const contract = getContract({
            client,
            chain,
            address: tokenAddress,
        });
        console.log("Contract initialized for token:", tokenAddress);

        const decimals = 6;
        const amountInWei = BigInt(Math.floor(amount * 10 ** decimals));

        let currentAllowance: bigint = BigInt(0);
        try {
            currentAllowance = await allowance({
                contract,
                owner: personalAccount.address,
                spender: smartAccount.address,
            });
            console.log(`Current allowance: ${currentAllowance.toString()}`);
        } catch (error: unknown) {
            console.error("Allowance check failed, assuming 0:", error);
        }

        if (currentAllowance < amountInWei) {
            console.log("Insufficient allowance detected. Approving...");
            const approveTx = await sendTransaction({
                transaction: approve({
                    contract,
                    spender: smartAccount.address,
                    amount: amount,
                }),
                account: smartAccount,
            });
            console.log(`Approval transaction hash: ${approveTx.transactionHash}`);
            await waitForReceipt(approveTx);
        }

        const transferTx = await sendTransaction({
            transaction: transfer({
                contract,
                to: recipientAddress,
                amount: amount,
            }),
            account: smartAccount,
        });

        console.log(`Transfer transaction hash: ${transferTx.transactionHash}`);
        return { transactionHash: transferTx.transactionHash };

    } catch (error: any) {
        console.error("Error in sendToken:", error.message);
        throw error;
    }
}

export async function unifyWallets(pk: string): Promise<string> {
    try {
        const personalAccount = privateKeyToAccount({ client, privateKey: pk });
        console.log("Personal account address:", personalAccount.address);

        // Use World as reference chain for unification
        const chain = defineChain(config.world.chainId); // World testnet chain ID 480
        console.log("Using chain ID for unification:", chain.id);

        const wallet = smartWallet({
            chain,
            sponsorGas: false, // Set to true when paymaster is funded
        });
        console.log("Smart wallet initialized with default factory");

        const smartAccount = await wallet.connect({ client, personalAccount });
        console.log("Unified smart wallet address for all chains:", smartAccount.address);

        return smartAccount.address;
    } catch (error: any) {
        console.error("Error in unifyWallets:", error.message);
        throw error;
    }
}

export async function getAllTokenTransferEvents(chain: Chain, walletAddress: string): Promise<TokenTransferEvent[]> {
    const apiEndpoints = {
        world: 'https://worldchain-mainnet.explorer.alchemy.com/api', // Placeholder; use actual World testnet explorer
        mantle: 'https://explorer.testnet.mantle.xyz/api',            // Mantle testnet explorer
        zksync: 'https://sepolia.era.zksync.dev/api',                // zkSync Sepolia testnet explorer
    };
    const apiKeys = {
        world: 'YOUR_ALCHEMY_API_KEY',   // Replace with actual key if needed
        mantle: 'NO_API_KEY_REQUIRED',   // Mantle testnet may not need one
        zksync: 'NO_API_KEY_REQUIRED',   // zkSync testnet may not need one
    };

    const baseURL = apiEndpoints[chain];
    const apiKey = apiKeys[chain];
    const url = `${baseURL}?module=account&action=tokentx&address=${walletAddress}&page=1&offset=5&sort=desc${apiKey !== 'NO_API_KEY_REQUIRED' ? `&apikey=${apiKey}` : ''}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch data from ${chain} API: ${response.status}`);
        }
        const data = await response.json();
        if (data.status !== '1') {
            throw new Error(data.message || `Failed to fetch token events for ${chain}`);
        }
        return data.result as TokenTransferEvent[];
    } catch (error: any) {
        console.error(`Error in getAllTokenTransferEvents for ${chain}:`, error.message);
        throw error;
    }
}

async function fetchUSDCToKESPrice() {
    const apiEndpoint = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=USDC&convert=KES';
    const headers = { 'X-CMC_PRO_API_KEY': '7e75c059-0ffc-41ca-ae72-88df27e0f202' };
    const response = await fetch(apiEndpoint, { headers });
    if (response.status !== 200) {
        throw new Error(`Failed to fetch USDC to KES price: ${response.status}`);
    }
    const data = await response.json();
    return data.data['USDC'].quote['KES'].price;
}

export async function getConversionRateWithCaching() {
    let cache = { rate: null as number | null, timestamp: 0 };
    const cacheDuration = 10 * 60 * 1000; // 10 minutes
    if (cache.rate && (Date.now() - cache.timestamp < cacheDuration)) {
        return cache.rate;
    } else {
        const rate = await fetchUSDCToKESPrice();
        cache = { rate, timestamp: Date.now() };
        return rate;
    }
}