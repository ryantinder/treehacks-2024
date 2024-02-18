// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";

import {BetFactory} from "../src/BetFactory.sol";
import {Bet} from "../src/Bet.sol";

contract CounterTest is Test {
    BetFactory public betFactory;
    address deployer = address(15);
    address alice = address(14);
    address bob = address(13);
    address charlie = address(12);

    function setUp() public {
        hoax(deployer, deployer);
        betFactory = new BetFactory();
        vm.label(address(betFactory), "betFactory");
        vm.label(deployer, "deployer");
        vm.label(alice, "alice");
        vm.label(bob, "bob");
        vm.label(charlie, "charlie");

        hoax(deployer, deployer);
        betFactory.mint(deployer, 1000e18);
        hoax(deployer, deployer);
        betFactory.transfer(alice, 100e18);
        hoax(deployer, deployer);
        betFactory.transfer(bob, 100e18);
        hoax(deployer, deployer);
        betFactory.transfer(charlie, 100e18);
    }

    function testSanity() public {
        console2.log(betFactory.owner());
    }

    function testMetadata() public {
        bytes32 salt = keccak256(abi.encodePacked("Salty..."));
        hoax(deployer, deployer);
        Bet bet = Bet(betFactory.createBet(100e18, "desc", salt));
        assertEq(address(bet.EBT()), address(betFactory));
        assertEq(bet.amountBet(), 100e18);
        assertEq(bet.desc(), "desc");
    }

    function testCreateBet() public {
        bytes32 salt = keccak256(abi.encodePacked("Salty..."));
        address predAddr = betFactory.getDeployed(salt);
        console2.log(predAddr);
        hoax(deployer, deployer);
        Bet bet = Bet(betFactory.createBet(100e18, "desc", salt));

        // betFactory.balanceOf(alice);
        // betFactory.balanceOf(bob);
        console2.log(address(bet.EBT()));
        console2.log(address(betFactory));
        hoax(alice, alice);
        betFactory.approve(address(bet), type(uint).max);
        hoax(alice, alice);
        bet.joinBet(true);
        assertEq(bet.hasBet(alice), true);

        hoax(bob, bob);
        betFactory.approve(address(bet), type(uint).max);
        hoax(bob, bob);
        bet.joinBet(false);
        assertEq(bet.hasBet(bob), true);

        hoax(charlie, charlie);
        betFactory.approve(address(bet), type(uint).max);
        hoax(charlie, charlie);
        bet.joinBet(false);
        assertEq(bet.hasBet(charlie), true);

        assertEq(bet.yesBets(0), alice);
        assertEq(bet.noBets(0), bob);

        hoax(deployer, deployer);
        bet.settleBet(false);
        assertEq(betFactory.balanceOf(alice), 0);
        assertEq(betFactory.balanceOf(bob), 150e18);
        assertEq(betFactory.balanceOf(charlie), 150e18);
        assertEq(betFactory.balanceOf(address(bet)), 0);
    }
}
