import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { getProvider } from '../config/constants';
import { getConversionRateWithCaching } from '../services/token';
import { ERC20ABI } from '../config/abi'; // Use full ERC20ABI
import config from '../config/env';

export async function conversionController(req: Request, res: Response) {
  const rate = await getConversionRateWithCaching();
  console.log(rate);
  res.send({ rate });
}

export const getUsdcBalance = async (req: Request, res: Response) => {
  const { address } = req.params;

  if (!address) {
    return res.status(400).send('Address is required as a parameter.');
  }

  try {
    const balances: { [key: string]: number } = {};
    const chains = [
      { name: 'world', tokenAddress: config.world.tokenAddress },
      { name: 'mantle', tokenAddress: config.mantle.tokenAddress },
      { name: 'zksync', tokenAddress: config.zksync.tokenAddress },
    ];

    for (const chain of chains) {
      const provider = getProvider(chain.name);
      const usdcContract = new ethers.Contract(chain.tokenAddress, ERC20ABI, provider);

      const balanceRaw = await usdcContract.balanceOf(address);
      console.log(`Raw balance on ${chain.name} for ${address}: ${balanceRaw.toString()}`);
      const decimals = await usdcContract.decimals();
      console.log(`Decimals on ${chain.name}: ${decimals}`);

      const balanceInUSDC = ethers.utils.formatUnits(balanceRaw, decimals);
      balances[chain.name] = parseFloat(balanceInUSDC);
    }

    const conversionRate = await getConversionRateWithCaching();
    const totalBalanceInUSDC = Object.values(balances).reduce((sum, bal) => sum + bal, 0);
    const balanceInKES = totalBalanceInUSDC * conversionRate;

    res.json({
      balances, // Per-chain balances
      totalBalanceInUSDC,
      balanceInKES: balanceInKES.toFixed(2),
      rate: conversionRate,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to fetch balance.');
  }
};