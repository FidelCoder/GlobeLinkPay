import dotenv from "dotenv";
import { defineChain } from "thirdweb";
dotenv.config();

let node_env = process.env.NODE_ENV || "development";

let config: Record<string, any> = {
    development: {
        THIRDWEB_SECRET_KEY: process.env.THIRDWEB_SECRET_KEY as string,
        AFRICAS_TALKING_API_KEY: process.env.AFRICAS_TALKING_API_KEY as string,
        MONGO_URL: process.env.DEV_MONGO_URL as string,
        MPESA_CONSUMER_KEY: process.env.MPESA_DEV_CONSUMER_KEY,
        MPESA_CONSUMER_SECRET: process.env.MPESA_DEV_CONSUMER_SECRET,
        MPESA_SHORTCODE: process.env.MPESA_DEV_SHORTCODE,
        MPESA_B2C_SHORTCODE: process.env.MPESA_DEV_B2C_SHORTCODE,
        MPESA_PASSKEY: process.env.MPESA_DEV_PASSKEY,
        MPESA_BASEURL: `https://sandbox.safaricom.co.ke`,
        MPESA_REQUEST_TIMEOUT: 5000,
        MPESA_WEBHOOK_URL: "https://3506-41-90-178-59.ngrok-free.app",
        world: {
            chainId: 480, // World Testnet
            tokenAddress: "0x...MOCK_USDC_ON_WORLD_TESTNET...", // Deploy and replace
        },
        mantle: {
            chainId: 5001, // Mantle Testnet
            tokenAddress: "0x...MOCK_USDC_ON_MANTLE_TESTNET...", // Deploy and replace
        },
        zksync: {
            chainId: 300, // zkSync Era Testnet
            tokenAddress: "0x...MOCK_USDC_ON_ZKSYNC_TESTNET...", // Deploy and replace
        },
        PLATFORM_WALLET_PRIVATE_KEY: process.env.DEV_PLATFORM_WALLET_PRIVATE_KEY,
        PLATFORM_WALLET_ADDRESS: process.env.DEV_PLATFORM_WALLET_ADDRESS,
    },
    production: {
        THIRDWEB_SECRET_KEY: process.env.THIRDWEB_SECRET_KEY as string,
        AFRICAS_TALKING_API_KEY: process.env.AFRICAS_TALKING_API_KEY as string,
        MONGO_URL: process.env.PROD_MONGO_URL as string,
        MPESA_CONSUMER_KEY: process.env.MPESA_PROD_CONSUMER_KEY,
        MPESA_CONSUMER_SECRET: process.env.MPESA_PROD_CONSUMER_SECRET,
        MPESA_SHORTCODE: process.env.MPESA_PROD_SHORTCODE,
        MPESA_PASSKEY: process.env.MPESA_PROD_PASSKEY,
        MPESA_STK_CALLBACK_URL: process.env.MPESA_PROD_STK_CALLBACK_URL,
        MPESA_BASEURL: `https://api.safaricom.co.ke`,
        MPESA_REQUEST_TIMEOUT: 5000,
        MPESA_WEBHOOK_URL: "https://cbca-41-90-178-59.ngrok-free.app",
        world: {
            chainId: 480, // World Testnet (or 1101 for mainnet if needed)
            tokenAddress: "0x...MOCK_USDC_ON_WORLD_TESTNET...", // Deploy and replace
        },
        mantle: {
            chainId: 5001, // Mantle Testnet (or 5000 for mainnet)
            tokenAddress: "0x...MOCK_USDC_ON_MANTLE_TESTNET...", // Deploy and replace
        },
        zksync: {
            chainId: 300, // zkSync Era Testnet (or 324 for mainnet)
            tokenAddress: "0x...MOCK_USDC_ON_ZKSYNC_TESTNET...", // Deploy and replace
        },
        PLATFORM_WALLET_PRIVATE_KEY: process.env.PROD_PLATFORM_WALLET_PRIVATE_KEY,
    },
    test: {
        THIRDWEB_SECRET_KEY: process.env.THIRDWEB_SECRET_KEY as string,
        AFRICAS_TALKING_API_KEY: process.env.AFRICAS_TALKING_API_KEY as string,
        MONGO_URL: process.env.DEV_MONGO_URL as string,
        MPESA_CONSUMER_KEY: process.env.MPESA_DEV_CONSUMER_KEY,
        MPESA_CONSUMER_SECRET: process.env.MPESA_DEV_CONSUMER_SECRET,
        MPESA_SHORTCODE: process.env.MPESA_DEV_SHORTCODE,
        MPESA_PASSKEY: process.env.MPESA_DEV_PASSKEY,
        MPESA_STK_CALLBACK_URL: process.env.MPESA_DEV_STK_CALLBACK_URL,
        MPESA_BASEURL: `https://sandbox.safaricom.co.ke`,
        MPESA_REQUEST_TIMEOUT: 5000,
        MPESA_WEBHOOK_URL: "https://cbca-41-90-178-59.ngrok-free.app",
        world: {
            chainId: 480, // World Testnet
            tokenAddress: "0x...MOCK_USDC_ON_WORLD_TESTNET...", // Deploy and replace
        },
        mantle: {
            chainId: 5001, // Mantle Testnet
            tokenAddress: "0x...MOCK_USDC_ON_MANTLE_TESTNET...", // Deploy and replace
        },
        zksync: {
            chainId: 300, // zkSync Era Testnet
            tokenAddress: "0x...MOCK_USDC_ON_ZKSYNC_TESTNET...", // Deploy and replace
        },
        PLATFORM_WALLET_PRIVATE_KEY: process.env.DEV_PLATFORM_WALLET_PRIVATE_KEY,
    },
};

export default config[node_env];