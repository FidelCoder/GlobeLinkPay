import { ethers, providers } from "ethers";
import { ERC20ABI } from "./abi";
import { defineChain } from "thirdweb";
import config from "./env";

export const world = defineChain(config["world"].chainId);
export const mantle = defineChain(config["mantle"].chainId);
export const zksync = defineChain(config["zksync"].chainId);

export function getProvider(chain: string): ethers.providers.Provider {
    switch (chain) {
        case 'world':
            return new ethers.providers.JsonRpcProvider('https://world-testnet.rpc.grove.city/v1/'); // World Testnet RPC
        case 'mantle':
            return new ethers.providers.JsonRpcProvider('https://rpc.testnet.mantle.xyz'); // Mantle Testnet RPC
        case 'zksync':
            return new ethers.providers.JsonRpcProvider('https://sepolia.era.zksync.dev'); // zkSync Era Testnet RPC
        default:
            throw new Error(`Unsupported chain: ${chain}`);
    }
}

export function getTokenAddress(chain: string): string {
    switch (chain) {
        case 'world':
            return config.world.tokenAddress; // Mock USDC address (to be deployed)
        case 'mantle':
            return config.mantle.tokenAddress; // Mock USDC address (to be deployed)
        case 'zksync':
            return config.zksync.tokenAddress; // Mock USDC address (to be deployed)
        default:
            throw new Error(`Unsupported chain: ${chain}`);
    }
}