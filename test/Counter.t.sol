// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";

import {BetFactory} from "../src/BetFactory.sol";
import {Bet} from "../src/Bet.sol";
import {IERC2612} from "lib/oz/contracts/interfaces/IERC2612.sol";

contract CounterTest is Test {
    BetFactory public betFactory;
    address deployer;
    address alice;
    address bob;
    address charlie;

    constructor() {
        alice = vm.addr(150);
        bob = vm.addr(151);
        charlie = vm.addr(152);
        deployer = vm.addr(153);
    }

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL"));

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

    function testJoinSide() public {
        uint pkey = vm.envUint("MY_KEY");
        address me = vm.addr(pkey);
        bytes32 salt = keccak256(abi.encodePacked("Salty..."));
        betFactory = BetFactory(0x5a512B031D4ef2204885c435657F14fA65E6E2a2);
        // hoax(deployer, deployer);
        // Bet bet = Bet(betFactory.createBet(100e18, "desc", salt));
        Bet bet = Bet(0x211bD202aF7A20cC60D24b3598982Ab72E0d3560);
        // hoax(deployer, deployer);
        // betFactory.transfer(me, 100e18);

        console2.log(me);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            pkey,
            _getPermitHash(
                me,
                address(bet),
                bet.amountBet(),
                betFactory.nonces(me), // Nonce is always 0 because user is a fresh address.
                type(uint).max
            )
        );
        hoax(me, me);
        bet.joinBet(true, type(uint).max, v, r, s);
    }

    function testBetState() public {
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
        bet.joinBet(true, type(uint).max, 0, bytes32(0), bytes32(0));
        assertEq(bet.hasBet(alice), true);

        (uint yeses, uint nos) = bet.lengths();
        assertEq(yeses, 1);
        assertEq(nos, 0);
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

    function testCreateBetPermit() public {
        bytes32 salt = keccak256(abi.encodePacked("Salty..."));
        address predAddr = betFactory.getDeployed(salt);
        console2.log(predAddr);
        hoax(deployer, deployer);
        Bet bet = Bet(betFactory.createBet(100e18, "desc", salt));

        // betFactory.balanceOf(alice);
        // betFactory.balanceOf(bob);
        console2.log(address(bet.EBT()));
        console2.log(address(betFactory));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            150,
            _getPermitHash(
                alice,
                address(bet),
                bet.amountBet(),
                betFactory.nonces(alice), // Nonce is always 0 because user is a fresh address.
                type(uint).max
            )
        );
        hoax(alice, alice);
        bet.joinBet(true, type(uint).max, v, r, s);
        assertEq(bet.hasBet(alice), true);

        (v, r, s) = vm.sign(
            151,
            _getPermitHash(
                bob,
                address(bet),
                100e18,
                0, // Nonce is always 0 because user is a fresh address.
                type(uint).max
            )
        );
        hoax(bob, bob);
        betFactory.approve(address(bet), type(uint).max);
        hoax(bob, bob);
        bet.joinBet(false, type(uint).max, v, r, s);
        assertEq(bet.hasBet(bob), true);

        (v, r, s) = vm.sign(
            152,
            _getPermitHash(
                charlie,
                address(bet),
                100e18,
                0, // Nonce is always 0 because user is a fresh address.
                type(uint).max
            )
        );
        hoax(charlie, charlie);
        betFactory.approve(address(bet), type(uint).max);
        hoax(charlie, charlie);
        bet.joinBet(false, type(uint).max, 0, 0, 0);
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
        bet.joinBet(true, type(uint).max, 0, 0, 0);
        assertEq(bet.hasBet(alice), true);

        hoax(bob, bob);
        betFactory.approve(address(bet), type(uint).max);
        hoax(bob, bob);
        bet.joinBet(false, type(uint).max, 0, 0, 0);
        assertEq(bet.hasBet(bob), true);

        hoax(charlie, charlie);
        betFactory.approve(address(bet), type(uint).max);
        hoax(charlie, charlie);
        bet.joinBet(false, type(uint).max, 0, 0, 0);
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

    function _getPermitHash(
        address owner,
        address spender,
        uint256 value,
        uint256 nonce,
        uint256 deadline
    ) private view returns (bytes32 h) {
        bytes32 domainHash = betFactory.DOMAIN_SEPARATOR();
        bytes32 typeHash = keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );
        bytes32 structHash = keccak256(
            abi.encode(typeHash, owner, spender, value, nonce, deadline)
        );
        return keccak256(abi.encodePacked("\x19\x01", domainHash, structHash));
    }
}
