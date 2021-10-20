// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';
import './ModaConstants.sol';
import './IVestingToken.sol';

contract Token is
	Initializable,
	OwnableUpgradeable,
	ERC20Upgradeable,
	UUPSUpgradeable,
	IVestingToken,
	AccessControlUpgradeable
{
	uint256 public holderCount;
	address public vestingContract;

	function TOKEN_UID() public pure returns (uint256) {
		return ModaConstants.TOKEN_UID;
	}

	/**
	 * @dev Our constructor (with UUPS upgrades we need to use initialize(), but this is only
	 *      able to be called once because of the initializer modifier.
	 */
	function initialize(address[] memory recipients, uint256[] memory amounts) public initializer {
		require(recipients.length == amounts.length, 'Token: recipients and amounts must match');

		__Ownable_init();
		__ERC20_init('moda', 'MODA');

		uint256 length = recipients.length;
		for (uint256 i = 0; i < length; i++) {
			_mintWithCount(recipients[i], amounts[i]);
		}

		__AccessControl_init();
		_setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
		_setRoleAdmin(ModaConstants.ROLE_TOKEN_CREATOR, 0x0);
		grantRole(ModaConstants.ROLE_TOKEN_CREATOR, _msgSender());
	}

	/**
	 * @dev This function is required by Open Zeppelin's UUPS proxy implementation
	 *      and indicates whether a contract upgrade should go ahead or not.
	 *
	 *      This implementation only allows the contract owner to perform upgrades.
	 */
	function _authorizeUpgrade(address) internal view override onlyOwner {}

	/**
	 * @dev Granting privileges required for allowing ModaCorePool and whatever else later,
	 *     the ability to mint Tokens as required.
	 */
	function grantPrivilege(bytes32 _role, address _account) public onlyOwner {
		grantRole(_role, _account);
	}

	/**
	 * @dev Internal function to manage the holderCount variable that should be called
	 *      BEFORE transfers alter balances.
	 */
	function _updateCountOnTransfer(
		address from,
		address to,
		uint256 amount
	) private {
		if (balanceOf(to) == 0 && amount > 0) {
			++holderCount;
		}

		if (balanceOf(from) == amount && amount > 0) {
			--holderCount;
		}
	}

	/**
	 * @dev Allows the vesting contract to mint tokens without limit.
	 */
	function vestingMint(address to, uint256 amount) external override onlyVesting {
		_updateCountOnTransfer(address(0), to, amount);
		_mint(to, amount);
	}

	/**
	 * @dev Allows the owner of the contract to set the vesting contract address
	 */
	function setVestingContract(address newVestingContract) external onlyOwner {
		address oldVestingContract = vestingContract;
		vestingContract = newVestingContract;

		emit VestingContractChanged(oldVestingContract, newVestingContract);
	}

	/**
	 * @dev A private function that mints while maintaining the holder count variable.
	 */
	function _mintWithCount(address to, uint256 amount) private {
		_updateCountOnTransfer(_msgSender(), to, amount);
		_mint(to, amount);
	}

	/**
	 * @dev Mints (creates) some tokens to address specified
	 * @dev The value specified is treated as is without taking
	 *      into account what `decimals` value is
	 * @dev Behaves effectively as `mintTo` function, allowing
	 *      to specify an address to mint tokens to
	 * @dev Requires sender to have `ROLE_TOKEN_CREATOR` permission
	 *
	 * @dev Throws on overflow, if totalSupply + _value doesn't fit into uint256
	 *
	 * @param _to an address to mint tokens to
	 * @param _value an amount of tokens to mint (create)
	 */
	function mint(address _to, uint256 _value) public onlyRole(ModaConstants.ROLE_TOKEN_CREATOR) {
		//console.log('Token.mint():', _msgSender());
		// non-zero recipient address check
		require(_to != address(0), 'ERC20: mint to the zero address'); // Zeppelin msg
		if (_value == 0) return;

		// non-zero _value and arithmetic overflow check on the total supply
		// this check automatically secures arithmetic overflow on the individual balance
		require(totalSupply() + _value > totalSupply(), 'zero value mint or arithmetic overflow');

		// uint256 overflow check (required by voting delegation)
		require(totalSupply() + _value <= type(uint192).max, 'total supply overflow (uint192)');

		// perform mint with ERC20 transfer event
		_mintWithCount(_to, _value);
	}

	/**
	 * @dev ERC20 transfer function. Overridden to maintain holder count variable.
	 */
	function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
		_updateCountOnTransfer(_msgSender(), recipient, amount);
		return super.transfer(recipient, amount);
	}

	/**
	 * @dev ERC20 transferFrom function. Overridden to maintain holder count variable.
	 */
	function transferFrom(
		address sender,
		address recipient,
		uint256 amount
	) public virtual override returns (bool) {
		_updateCountOnTransfer(sender, recipient, amount);
		return super.transferFrom(sender, recipient, amount);
	}

	/**
	 * @dev Emitted whenever the owner changes the vesting contract address.
	 */
	event VestingContractChanged(address oldVestingContract, address newVestingContract);

	/**
	 * @dev Throws if called by any account other than the vesting contract.
	 */
	modifier onlyVesting() {
		require(vestingContract == _msgSender(), 'Token: caller is not the vesting contract');
		_;
	}
}
