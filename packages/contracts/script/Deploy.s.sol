// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {SpacyAttestations} from "../src/SpacyAttestations.sol";

contract Deploy is Script {
    function run() external returns (SpacyAttestations attestations) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        attestations = new SpacyAttestations();
        vm.stopBroadcast();
        console.log("SpacyAttestations deployed at:", address(attestations));
    }
}
