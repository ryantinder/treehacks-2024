// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {CREATE3} from "lib/solmate/src/utils/CREATE3.sol";
import {BetFactory} from "./BetFactory.sol";

/**
 * @title BetFactory
 * @author @0xTinder
 * @notice
 */
contract Bet {
    using SafeTransferLib for BetFactory;
    BetFactory public EBT;
    uint public amountBet;
    string public desc;

    address[] public yesBets;
    address[] public noBets;
    mapping(address => bool) public hasBet;

    // bool isInitialized = false;

    constructor(uint _amountBet, string memory _desc, address _factory) {
        // require(!isInitialized, "Already initialized");
        EBT = BetFactory(_factory);
        amountBet = _amountBet;
        desc = _desc;
        // isInitialized = true;
    }

    function joinBet(bool _side) external {
        require(!hasBet[msg.sender], "Already bet");
        require(EBT.balanceOf(msg.sender) >= amountBet, "Not enough funds");
        EBT.safeTransferFrom(msg.sender, address(this), amountBet);
        if (_side) {
            yesBets.push(msg.sender);
        } else {
            noBets.push(msg.sender);
        }
        hasBet[msg.sender] = true;
    }

    function settleBet(bool _side) external {
        require(msg.sender == EBT.owner(), "!auth");
        uint balance = EBT.balanceOf(address(this));
        if (_side) {
            uint length = yesBets.length;
            uint amount = balance / length;
            for (uint i = 0; i < length; i++) {
                EBT.safeTransfer(yesBets[i], amount);
            }
        } else {
            uint length = noBets.length;
            uint amount = balance / length;
            for (uint i = 0; i < noBets.length; i++) {
                EBT.safeTransfer(noBets[i], amount);
            }
        }
    }
}
