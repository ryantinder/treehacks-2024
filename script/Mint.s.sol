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
            0x04A30E35908B270b18E68Daa64C5e42E028be804
        );

        factory.mint(0xa9b95da31C3Be19979611b5deA202F16c7704805, 100e18);
        vm.stopBroadcast();
    }
}
