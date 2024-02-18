// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {BetFactory} from "../src/BetFactory.sol";

contract Deploy is Script {
    function setUp() public {}

    function run() public {
        uint pkey = vm.envUint("PRIVATE_KEY");
        address me = vm.rememberKey(pkey);
        vm.startBroadcast(pkey);

        BetFactory factory = new BetFactory();
        console2.log(address(factory));

        vm.stopBroadcast();
    }
}
