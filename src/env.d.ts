/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly KV_REST_API_URL: string;
	readonly KV_REST_API_TOKEN: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
