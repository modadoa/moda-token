// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import './ILinkedToMODA.sol';

/**
 * @title Moda Pool
 *
 * @notice An abstraction representing a pool, see ModaPoolBase for details
 *
 * @author Pedro Bergamini, reviewed by Basil Gorin
 */
interface IPool is ILinkedToMODA {
	/**
	 * @dev Deposit is a key data structure used in staking,
	 *      it represents a unit of stake with its amount, weight and term (time interval)
	 */
	struct Deposit {
		// @dev token amount staked
		uint256 tokenAmount;
		// @dev stake weight
		uint256 weight;
		// @dev locking period - from
		uint64 lockedFrom;
		// @dev locking period - until
		uint64 lockedUntil;
		// @dev indicates if the stake was created as a yield reward
		bool isYield;
	}

	// for the rest of the functions see Soldoc in ModaPoolBase

	function smoda() external view returns (address);

	function poolToken() external view returns (address);

	function isFlashPool() external view returns (bool);

	function weight() external view returns (uint32);

	function lastYieldDistribution() external view returns (uint64);

	function yieldRewardsPerWeight() external view returns (uint256);

	function usersLockingWeight() external view returns (uint256);

	function pendingYieldRewards(address _user) external view returns (uint256);

	function balanceOf(address _user) external view returns (uint256);

	function getDeposit(address _user, uint256 _depositId) external view returns (Deposit memory);

	function getDepositsLength(address _user) external view returns (uint256);

	function stake(
		uint256 _amount,
		uint64 _lockedUntil,
		bool useSMODA
	) external;

	function unstake(
		uint256 _depositId,
		uint256 _amount,
		bool useSMODA
	) external;

	function sync() external;

	function processRewards(bool useSMODA) external;

	function setWeight(uint32 _weight) external;
}
