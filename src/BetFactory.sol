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

    // address public bet_impl;

    constructor() ERC20("Estimates Token", "ET", 18) Owned(msg.sender) {
        // bet_impl = address(new Bet());
    }

    function mint(address to, uint amount) external onlyOwner {
        _mint(to, amount);
    }

    function getDeployed(bytes32 salt) external view returns (address) {
        return CREATE3.getDeployed(salt);
    }

    function createBet(
        uint amountBet,
        string memory desc,
        bytes32 salt
    ) external returns (address) {
        address deployed = CREATE3.deploy(
            salt,
            abi.encodePacked(
                type(Bet).creationCode,
                abi.encode(amountBet, desc, address(this))
            ),
            0
        );
        return deployed;
        // // convert the address to 20 bytes
        // bytes20 implementationContractInBytes = bytes20(bet_impl);
        // //address to assign a cloned proxy
        // address proxy;
        // // as stated earlier, the minimal proxy has this bytecode
        // // <3d602d80600a3d3981f3363d3d373d3d3d363d73><address of implementation contract><5af43d82803e903d91602b57fd5bf3>
        // // <3d602d80600a3d3981f3> == creation code which copies runtime code into memory and deploys it
        // // <363d3d373d3d3d363d73> <address of implementation contract> <5af43d82803e903d91602b57fd5bf3> == runtime code that makes a delegatecall to the implentation contract
        // assembly {
        //     /*
        //     reads the 32 bytes of memory starting at the pointer stored in 0x40
        //     In solidity, the 0x40 slot in memory is special: it contains the "free memory pointer"
        //     which points to the end of the currently allocated memory.
        //     */
        //     let clone := mload(0x40)
        //     // store 32 bytes to memory starting at "clone"
        //     mstore(
        //         clone,
        //         0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
        //     )
        //     /*
        //       |              20 bytes                |
        //     0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
        //                                               ^
        //                                               pointer
        //     */
        //     // store 32 bytes to memory starting at "clone" + 20 bytes
        //     // 0x14 = 20
        //     mstore(add(clone, 0x14), implementationContractInBytes)
        //     /*
        //       |               20 bytes               |                 20 bytes              |
        //     0x3d602d80600a3d3981f3363d3d373d3d3d363d73bebebebebebebebebebebebebebebebebebebebe
        //                                                                                       ^
        //                                                                                       pointer
        //     */
        //     // store 32 bytes to memory starting at "clone" + 40 bytes
        //     // 0x28 = 40
        //     mstore(
        //         add(clone, 0x28),
        //         0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
        //     )
        //     /*
        //     |                 20 bytes                  |          20 bytes          |           15 bytes          |
        //     0x3d602d80600a3d3981f3363d3d373d3d3d363d73b<implementationContractInBytes>5af43d82803e903d91602b57fd5bf3 == 45 bytes in total
        //     */
        //     // create a new contract
        //     // send 0 Ether
        //     // code starts at the pointer stored in "clone"
        //     // code size == 0x37 (55 bytes)
        //     proxy := create(0, clone, 0x37)
        // }
        // // Call initialization
        // Bet(proxy).initializer(amountBet, desc, address(this));
        // return proxy;
    }
}
