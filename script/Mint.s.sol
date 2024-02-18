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
            0x5F9b4EF03212fB632097B4F87353995125053E68
        );

        factory.mint(0xda2228a2aA84EC9Ea6a32F898d2dbf8bAbE27a0c, 100e18);
        vm.stopBroadcast();
    }
}
