export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code)
  }
}

export class AuthError extends HttpError {
  constructor(code: string) {
    super(401, code)
  }
}

export class ValidationError extends HttpError {
  constructor(
    public details: unknown,
    code = 'validation_failed',
  ) {
    super(400, code)
  }
}

export class OrbitportError extends HttpError {
  constructor(
    public underlying: unknown,
    code = 'orbitport_error',
  ) {
    super(502, code)
  }
}

export class ChainError extends HttpError {
  constructor(
    public underlying: unknown,
    code = 'chain_error',
  ) {
    super(502, code)
  }
}

export class IpfsError extends HttpError {
  constructor(
    public underlying: unknown,
    code = 'ipfs_error',
  ) {
    super(502, code)
  }
}

export class AttestationVerifyError extends HttpError {
  constructor(public reason: string) {
    super(500, 'attestation_verify_failed', reason)
  }
}

export class NotFoundError extends HttpError {
  constructor(code = 'not_found') {
    super(404, code)
  }
}
