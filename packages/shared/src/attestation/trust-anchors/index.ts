/**
 * Bundled trust anchors. Replace these placeholder PEMs with the real
 * Intel TDX / AMD SEV roots before deploy. The verifiers in
 * `verify-tdx.ts` and `verify-sev.ts` consume them by reference; swapping
 * anchors does not require touching the verification logic.
 */

export const intelTdxRootCa = `-----BEGIN CERTIFICATE-----
PLACEHOLDER_INTEL_SGX_ROOT_CA
-----END CERTIFICATE-----
`

export const intelTdxIntermediateCa = `-----BEGIN CERTIFICATE-----
PLACEHOLDER_INTEL_SGX_PROCESSOR_CA
-----END CERTIFICATE-----
`

export const amdArkCa = `-----BEGIN CERTIFICATE-----
PLACEHOLDER_AMD_ARK
-----END CERTIFICATE-----
`

export const amdAskCa = `-----BEGIN CERTIFICATE-----
PLACEHOLDER_AMD_ASK
-----END CERTIFICATE-----
`
