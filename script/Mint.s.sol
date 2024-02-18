// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {BetFactory} from "../src/BetFactory.sol";

contract Mint is Script {
    function setUp() public {}

    function run() public {
        uint pkey = vm.envUint("PRIVATE_KEY");
        address me = vm.rememberKey(pkey);
        vm.startBroadcast(pkey);

        BetFactory factory = BetFactory(
            // MUST UPDATE
            0x5a512B031D4ef2204885c435657F14fA65E6E2a2
        );

        factory.mint(0xda2228a2aA84EC9Ea6a32F898d2dbf8bAbE27a0c, 100e18);
        factory.mint(0x61e5481a12411Ce31EcdB594d8cb7edE26874DC3, 100e18);
        factory.mint(0x8eEC6e03214a2E7842e37e10F99AC8c3c89BB49E, 100e18);
        factory.mint(0xB638D4Dd88C80f5e2cb5501DdF173A3E02b2a3b5, 100e18);
        vm.stopBroadcast();
    }
}
