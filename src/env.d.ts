/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_GABA_CONVEX_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
