import {
  type Hex,
  parseSignature,
  serializeTransaction,
  type TransactionSerializableEIP1559,
} from 'viem'

export function spliceSignature(unsigned: TransactionSerializableEIP1559, signatureHex: Hex): Hex {
  const sig = parseSignature(signatureHex)
  return serializeTransaction(unsigned, sig)
}
