import type {
  ProofPayload,
  SessionUser,
  SignDigestRequest,
  SignDigestResponse,
  WalletMeResponse,
} from '@spacy/shared/schemas'

export class SpacyApi {
  constructor(private baseUrl: string) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.headers ?? {}),
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new SpacyApiError(res.status, body)
    }
    return res.json() as Promise<T>
  }

  async me(): Promise<SessionUser | null> {
    try {
      return await this.req<SessionUser>('/auth/me')
    } catch (err) {
      if (err instanceof SpacyApiError && err.status === 401) return null
      throw err
    }
  }

  async logout(): Promise<void> {
    await this.req('/auth/logout', { method: 'POST' })
  }

  async provisionWallet(): Promise<WalletMeResponse> {
    return this.req<WalletMeResponse>('/wallet/provision', { method: 'POST' })
  }

  async getWallet(): Promise<WalletMeResponse | null> {
    try {
      return await this.req<WalletMeResponse>('/wallet/me')
    } catch (err) {
      if (err instanceof SpacyApiError && err.status === 404) return null
      throw err
    }
  }

  async signDigest(req: SignDigestRequest): Promise<SignDigestResponse> {
    return this.req<SignDigestResponse>('/sign/digest', {
      method: 'POST',
      body: JSON.stringify(req),
    })
  }

  async getProof(slug: string): Promise<ProofPayload> {
    return this.req<ProofPayload>(`/proof/${encodeURIComponent(slug)}`)
  }

  loginUrl(): string {
    return `${this.baseUrl}/auth/google`
  }
}

export class SpacyApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`spacy_api_${status}`)
  }
}
