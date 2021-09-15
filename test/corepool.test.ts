import { BigNumber } from '@ethersproject/bignumber';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { EscrowedModaERC20, ModaCorePool, Token } from '../typechain';
import { add, addTimestamp, fastForward, fromTimestamp } from './utils';

function toEth(amount: string): BigNumber {
	return ethers.utils.parseEther(amount);
}
const ROLE_TOKEN_CREATOR = [
	0, 0xa, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];
const ROLE_POOL_STAKING = [
	0, 0xb, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

type Deposit = Array<unknown>;

const MILLIS: number = 1000;
const YEAR: number = 365 * 24 * 60 * 60 * MILLIS;

describe('Core Pool', () => {
	let token: Token;
	let escrowToken: EscrowedModaERC20;
	let corePool: ModaCorePool;
	let start = new Date();
	let owner: SignerWithAddress, user0: SignerWithAddress, user1: SignerWithAddress;
	let addr: string[];
	let userBalances = [toEth('6500000'), toEth('3500000')];

	function logSetup() {
		console.log('Owner', owner.address);
		console.log('Users', addr);
		console.log('Token', token.address);
		console.log('Escrow Token', escrowToken.address);
		console.log('Core Pool', corePool.address);
	}

	beforeEach(async () => {
		let currentBlock = await ethers.provider.getBlock(ethers.provider.getBlockNumber());
		start = fromTimestamp(currentBlock.timestamp);

		[owner, user0, user1] = await ethers.getSigners();
		addr = [user0.address, user1.address];

		const tokenFactory = await ethers.getContractFactory('Token');
		token = (await upgrades.deployProxy(tokenFactory, [addr, userBalances], {
			kind: 'uups',
		})) as Token;
		await token.deployed();

		const escrowTokenFactory = await ethers.getContractFactory('EscrowedModaERC20');
		escrowToken = (await escrowTokenFactory.deploy()) as EscrowedModaERC20;
		await escrowToken.deployed();

		const nextBlock = (await ethers.provider.getBlockNumber()) + 1;
		//console.log(`Block number: ${nextBlock}`);
		const corePoolFactory = await ethers.getContractFactory('ModaCorePool');
		corePool = (await corePoolFactory.deploy(
			token.address, // moda MODA ERC20 Token ModaERC20 address
			escrowToken.address, // smoda sMODA ERC20 Token EscrowedModaERC20 address
			token.address, // poolToken token the pool operates on, for example MODA or MODA/ETH pair
			100, // weight number representing a weight of the pool, actual weight fraction is calculated as that number divided by the total pools weight and doesn't exceed one
			150000, // modaPerBlock initial MODA/block value for rewards
			216000, // blocksPerUpdate how frequently the rewards gets updated (decreased by 3%), blocks
			nextBlock, // initBlock initial block used to calculate the rewards
			nextBlock + 3672000 // endBlock block number when farming stops and rewards cannot be updated anymore
		)) as ModaCorePool;
		await corePool.deployed();

		await token.grantPrivilege(ROLE_TOKEN_CREATOR, corePool.address);
		await escrowToken.grantPrivilege(ROLE_TOKEN_CREATOR, corePool.address);
	});

	it.skip('Should log the set up', async () => {
		logSetup();
	});

	it('Should refuse any but a CorePool to create a pool stake', async () => {
		//logSetup();
		await expect(
			corePool.connect(user0).stakeAsPool(user1.address, toEth('100'))
		).to.be.revertedWith(
			`AccessControl: account ${addr[0].toLowerCase()} is missing role 0x000b000000000000000000000000000000000000000000000000000000000000`
		);
	});

	it('Should allow a user to unstake a locked deposit after 1 year', async () => {
		//logSetup();
		// Set up the balance first
		expect(await token.balanceOf(addr[0])).to.equal(userBalances[0]);

		// Calculate a suitable locking end date
		let endDate: Date = new Date();
		endDate.setTime(start.getTime() + YEAR - 10 * MILLIS);
		let lockUntil: BigNumber = BigNumber.from(endDate.getTime()).div(MILLIS);
		console.log('lockedUntil', lockUntil);
		const amount: BigNumber = BigNumber.from(104);
		await token.connect(user0).approve(corePool.address, amount);
		expect(await token.allowance(addr[0], corePool.address)).to.equal(amount);
		await corePool.connect(user0).stake(amount, lockUntil, false);

		// Staking moves the user's MODA from the Token contract to the CorePool.
		expect(await token.balanceOf(addr[0])).to.equal(userBalances[0].sub(amount));
		//console.log(contractTx);
		expect(await corePool.getDepositsLength(addr[0])).to.equal(1);

		// Now attempt to withdraw it.
		await expect(
			corePool.connect(user0).unstake(toEth('0'), toEth('100'), true)
		).to.be.revertedWith('deposit not yet unlocked');
		// Wait for more than a year though and...
		await fastForward(add(start, { years: 1, days: 1 }));
		// Before unstake executes the user should have zero sMODA.
		expect(await escrowToken.balanceOf(addr[0])).to.equal(0);
		await corePool.connect(user0).unstake(BigNumber.from(0), amount, true);

		// Examine the tokens this address now owns.
		expect(await token.balanceOf(addr[0])).to.equal(userBalances[0]);
		expect(await escrowToken.balanceOf(addr[0])).to.equal(449999);
		// Is there anything remaining?
		expect(await corePool.getDepositsLength(addr[0])).to.equal(1);
		// It may seem that way but...
		let [
			// @dev token amount staked
			tokenAmount,
			// @dev stake weight
			weight,
			// @dev locking period - from
			lockedFrom,
			// @dev locking period - until
			lockedUntil,
			// @dev indicates if the stake was created as a yield reward
			isYield,
		] = await corePool.getDeposit(addr[0], BigNumber.from(0));
		expect(tokenAmount).to.equal(0);
		expect(weight).to.equal(0);
		expect(lockedFrom).to.equal(0);
		expect(lockedUntil).to.equal(0);
		expect(isYield).to.equal(false);
	});

	it('Should revert on invalid lock interval', async () => {
		let endDate: Date = new Date();
		endDate.setTime(start.getTime() + YEAR * 2);
		let lockedUntil: BigNumber = BigNumber.from(endDate.getTime()).div(MILLIS);
		await expect(
			corePool.connect(user0).stake(toEth('100'), lockedUntil, false)
		).to.be.revertedWith('invalid lock interval');
	});
});
