// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {SpacyAttestations} from "../src/SpacyAttestations.sol";

contract SpacyAttestationsTest is Test {
    SpacyAttestations internal attestations;
    address internal relayer = address(0xBEEF);
    address internal stranger = address(0xDEAD);
    address internal wallet = address(0xCAFE);

    event AttestationPublished(address indexed wallet, bytes32 indexed txHash, string ipfsCid);

    function setUp() public {
        attestations = new SpacyAttestations();
    }

    function test_PublishEmitsEvent() public {
        bytes32 txHash = keccak256("tx-1");
        string memory cid = "bafyTestCid";

        vm.expectEmit(true, true, false, true);
        emit AttestationPublished(wallet, txHash, cid);

        vm.prank(relayer);
        attestations.publish(wallet, txHash, cid);
    }

    function test_AnyoneCanPublish() public {
        bytes32 txHash = keccak256("tx-2");
        string memory cid = "bafyAnyone";

        vm.expectEmit(true, true, false, true);
        emit AttestationPublished(wallet, txHash, cid);

        vm.prank(stranger);
        attestations.publish(wallet, txHash, cid);
    }

    function test_DuplicatePublishIsAllowed() public {
        // The contract is a discovery index, not a registry. Re-publishing
        // is allowed; verifiers reconcile by reading event logs.
        bytes32 txHash = keccak256("tx-3");
        vm.startPrank(relayer);
        attestations.publish(wallet, txHash, "cid-a");
        attestations.publish(wallet, txHash, "cid-b");
        vm.stopPrank();
    }
}
