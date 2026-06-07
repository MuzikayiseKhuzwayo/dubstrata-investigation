import { ethers } from 'ethers';
import { Mandate } from './types';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

// EIP-712 Domain definition
export const MANDATE_DOMAIN = {
  name: 'Dubstrata Mandate Registry',
  version: '1.0.0',
  chainId: 137, // Polygon Mainnet
  verifyingContract: '0x0000000000000000000000000000000000000000'
};

// EIP-712 Types definition
export const MANDATE_TYPES = {
  Mandate: [
    { name: 'agentId', type: 'string' },
    { name: 'maxPositionSize', type: 'uint256' }, // in USD cents (to avoid floats)
    { name: 'dailyLimit', type: 'uint256' }, // in USD cents
    { name: 'expiration', type: 'uint256' } // expiration timestamp in seconds
  ]
};

export class MandateVerifier {
  private mandatesPath: string;

  constructor(mandatesPath: string = process.env.DUBSTRATA_MANDATE_PATH || './data/mandates.json') {
    this.mandatesPath = mandatesPath;
    this.ensureMandateFileExists();
  }

  private ensureMandateFileExists() {
    const dir = path.dirname(this.mandatesPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Always keep default mandate updated in dev/simulation
    logger.info('Updating default cryptographically signed mandate...');
    const defaultMandate = this.generateDefaultMandate();
    fs.writeFileSync(this.mandatesPath, JSON.stringify([defaultMandate], null, 2));
  }

  // Generates a mock but cryptographically valid mandate signed by a demo private key
  private generateDefaultMandate(): Mandate {
    return {
      agentId: 'antigravity-fund-manager',
      maxPositionSize: 500, // $500.00
      dailyLimit: 2000,    // $2,000.00
      allowedCategories: ['Politics', 'Technology', 'Science', 'Finance', 'Crypto', 'AI', 'General', 'Research'],
      expiration: 1893456000, // Jan 1, 2030
      signature: '0xb6870c5cf42c4e7e46e9c07ed524e3359d7cf4098c3ae9a27db235ddc4dcd668078b0f0e3cfa2a53f4a95be34d87d838c65b5d9c1fb1f9edea54af56f0999ae31b',
      signerAddress: '0x14791697260E4c9A71f18484C9f997B308e59325'
    };
  }

  public loadMandates(): Mandate[] {
    try {
      if (!fs.existsSync(this.mandatesPath)) {
        this.ensureMandateFileExists();
      }
      const data = fs.readFileSync(this.mandatesPath, 'utf-8');
      return JSON.parse(data);
    } catch (err: any) {
      logger.error(`Failed to load mandates: ${err.message}`);
      return [];
    }
  }

  public verifySignature(mandate: Mandate): boolean {
    try {
      const value = {
        agentId: mandate.agentId,
        maxPositionSize: BigInt(mandate.maxPositionSize * 100),
        dailyLimit: BigInt(mandate.dailyLimit * 100),
        expiration: BigInt(mandate.expiration)
      };

      const recoveredAddress = ethers.verifyTypedData(
        MANDATE_DOMAIN,
        MANDATE_TYPES,
        value,
        mandate.signature
      );

      const isValid = recoveredAddress.toLowerCase() === mandate.signerAddress.toLowerCase();
      if (!isValid) {
        logger.warn(`Signature verification failed! Recovered address: ${recoveredAddress}, expected: ${mandate.signerAddress}`);
      }
      return isValid;
    } catch (err: any) {
      logger.error(`Error verifying EIP-712 signature: ${err.message}`);
      return false;
    }
  }

  public evaluateTrade(
    agentId: string,
    category: string,
    amountUSD: number,
    dailySpentUSD: number
  ): { allowed: boolean; reason?: string; activeMandate?: Mandate } {
    const mandates = this.loadMandates();
    const activeMandate = mandates.find(m => m.agentId === agentId);

    if (!activeMandate) {
      return { allowed: false, reason: `No active mandate found for agent ID '${agentId}'` };
    }

    // 1. Verify cryptography
    if (!this.verifySignature(activeMandate)) {
      return { allowed: false, reason: `Cryptographic mandate signature verification failed for signer ${activeMandate.signerAddress}` };
    }

    // 2. Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (activeMandate.expiration < now) {
      return { allowed: false, reason: `Mandate expired on ${new Date(activeMandate.expiration * 1000).toISOString()}` };
    }

    // 3. Check position size limits
    if (amountUSD > activeMandate.maxPositionSize) {
      return { 
        allowed: false, 
        reason: `Trade size ($${amountUSD}) exceeds the maximum position size limit of $${activeMandate.maxPositionSize} in mandate`,
        activeMandate 
      };
    }

    // 4. Check category restrictions
    const isCategoryAllowed = activeMandate.allowedCategories.some(
      cat => cat.toLowerCase() === category.toLowerCase()
    );
    if (!isCategoryAllowed) {
      return { 
        allowed: false, 
        reason: `Category '${category}' is not authorized by the mandate. Allowed: ${activeMandate.allowedCategories.join(', ')}`,
        activeMandate
      };
    }

    // 5. Check daily limit
    if (dailySpentUSD + amountUSD > activeMandate.dailyLimit) {
      return { 
        allowed: false, 
        reason: `Cumulative trade size ($${dailySpentUSD + amountUSD}) would exceed the daily trading limit of $${activeMandate.dailyLimit}`,
        activeMandate
      };
    }

    return { allowed: true, activeMandate };
  }
}
