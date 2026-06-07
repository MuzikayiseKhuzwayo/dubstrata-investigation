import { ethers } from 'ethers';

const MANDATE_DOMAIN = {
  name: 'Dubstrata Mandate Registry',
  version: '1.0.0',
  chainId: 137, // Polygon Mainnet
  verifyingContract: '0x0000000000000000000000000000000000000000'
};

const MANDATE_TYPES = {
  Mandate: [
    { name: 'agentId', type: 'string' },
    { name: 'maxPositionSize', type: 'uint256' },
    { name: 'dailyLimit', type: 'uint256' },
    { name: 'expiration', type: 'uint256' }
  ]
};

async function main() {
  const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
  const wallet = new ethers.Wallet(privateKey);
  
  const value = {
    agentId: 'antigravity-fund-manager',
    maxPositionSize: BigInt(500 * 100),
    dailyLimit: BigInt(2000 * 100),
    expiration: BigInt(1893456000) // Jan 1, 2030
  };

  const signature = await wallet.signTypedData(
    MANDATE_DOMAIN,
    MANDATE_TYPES,
    value
  );

  console.log('Wallet Address:', wallet.address);
  console.log('Signature:', signature);
}

main().catch(console.error);
