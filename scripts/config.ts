import { parseEther } from 'ethers/lib/utils';

const GOERLI_MODA_TOKEN = '0x03152fe681eD035D41178C5b6E6a4b8D70902345';
const GOERLI_MODA_TOKEN_UPGRADABLE = '0x68d449757daf7652cd6d443bac23fb7a77ec39fd';
const GOERLI_FACTORY_ADDRESS = '0x868a6403f5249f75E936286b75036cd4BB092a89';
const GOERLI_CORE_POOL_ADDRESS = '0x4Dc06350ae75d9E79F7585043FE62Ad6BfFCCAEB';
const GOERLI_SLP_TOKEN_ADDRESS = '0x9fC84a564cCe8dd502eC199aDdEeE8FF0fBdd060';
const GOERLI_SLP_POOL_ADDRESS = '0x7Ce307FfE0AE194597C2B7CCf79Ce1A6a72f2155';

// TODO: add mainnet values when releasing to production
const MAINNET_MODA_TOKEN = '';

// ===================================================
// Change this when deploying...
export const MODA_TOKEN_ADDRESS = GOERLI_MODA_TOKEN;
export const FACTORY_ADDRESS = GOERLI_FACTORY_ADDRESS;
export const CORE_POOL_ADDRESS = GOERLI_CORE_POOL_ADDRESS;
export const SLP_POOL_ADDRESS = GOERLI_SLP_POOL_ADDRESS;
export const SLP_TOKEN_ADDRESS = GOERLI_SLP_TOKEN_ADDRESS;
export const START_TIMESTAMP = 1668290449;
export const END_TIMESTAMP = 1699826449;
export const SLP_POOL_START_TIMESTAMP = 1668290449;
export const WEIGHT = 200;
export const ETH_AMOUNT = parseEther('1');
// ===================================================
