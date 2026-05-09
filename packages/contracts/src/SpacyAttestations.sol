// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.27;

/**
 * @title  SpacyAttestations
 * @notice Censorship-resistant discovery index pointing at attestation
 *         receipts pinned on IPFS. Anyone can publish; the value lives in
 *         the (msg.sender, wallet, txHash, ipfsCid, blockNumber) tuple
 *         observable in event logs. The contract is intentionally not a
 *         trust anchor — receipts at the CID either verify against the
 *         Intel TDX / AMD SEV-SNP roots, or they don't.
 */
contract SpacyAttestations {
    /// @notice Emitted whenever an attestation receipt is pinned to IPFS.
    /// @param wallet  The Spacy-managed wallet whose tx the receipt covers.
    /// @param txHash  The transaction the receipt attests.
    /// @param ipfsCid The CIDv1 string of the attestation JSON.
    event AttestationPublished(address indexed wallet, bytes32 indexed txHash, string ipfsCid);

    /// @notice Publish a pointer to an off-chain attestation receipt.
    /// @dev    Anyone can call. Relayers pay gas on users' behalf in our
    ///         deployment; third parties can publish their own receipts
    ///         using the same schema if they like.
    function publish(address wallet, bytes32 txHash, string calldata ipfsCid) external {
        emit AttestationPublished(wallet, txHash, ipfsCid);
    }
}
