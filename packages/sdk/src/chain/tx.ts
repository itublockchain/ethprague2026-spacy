import {
  type Hex,
  keccak256,
  serializeTransaction,
  type TransactionSerializableEIP1559,
} from 'viem'

export interface UnsignedEip1559 {
  chainId: number
  nonce: number
  to: Hex
  value: bigint
  data: Hex
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  gas: bigint
}

export function buildUnsigned(input: UnsignedEip1559): TransactionSerializableEIP1559 {
  return {
    type: 'eip1559',
    chainId: input.chainId,
    nonce: input.nonce,
    to: input.to,
    value: input.value,
    data: input.data,
    maxFeePerGas: input.maxFeePerGas,
    maxPriorityFeePerGas: input.maxPriorityFeePerGas,
    gas: input.gas,
  }
}

export function digestForUnsigned(tx: TransactionSerializableEIP1559): Hex {
  return keccak256(serializeTransaction(tx))
}

export function toMetadata(tx: UnsignedEip1559): {
  chainId: number
  nonce: number
  to: Hex
  value: string
  data: Hex
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  gas: string
} {
  return {
    chainId: tx.chainId,
    nonce: tx.nonce,
    to: tx.to,
    value: tx.value.toString(),
    data: tx.data,
    maxFeePerGas: tx.maxFeePerGas.toString(),
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas.toString(),
    gas: tx.gas.toString(),
  }
}
