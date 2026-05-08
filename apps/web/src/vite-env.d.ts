/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPACY_API_URL?: string
  readonly VITE_SPACY_CHAIN_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
