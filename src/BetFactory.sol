// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {CREATE3} from "lib/solmate/src/utils/CREATE3.sol";
import {Bet} from "./Bet.sol";

/**
 * @title BetFactory
 * @author @0xTinder
 * @notice
 */
contract BetFactory is Owned, ERC20 {
    using SafeTransferLib for ERC20;

    constructor() ERC20("Estimates Token", "ET", 18) Owned(msg.sender) {}

    function createBet(
        address user,
        uint amountBet,
        bool side,
        string memory desc,
        bytes32 salt
    ) external onlyOwner returns (address) {
        address deployed = CREATE3.deploy(
            salt,
            abi.encodePacked(
                type(Bet).creationCode,
                abi.encode(user, amountBet, side, desc)
            ),
            0
        );

        // transfer users funds to bet contract, will revert if not enough funds
        balanceOf[user] -= amountBet;
        unchecked {
            balanceOf[deployed] += amountBet;
        }
        emit Transfer(user, deployed, amountBet);

        return deployed;
    }

    function getDeployed(bytes32 salt) external view returns (address) {
        return CREATE3.getDeployed(salt);
    }
}
