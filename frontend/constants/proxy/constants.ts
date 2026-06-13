export const CATALOGUE =
    process.env.CATALOGUE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.AXUM_GATEWAY_URL ??
    'http://127.0.0.1:8001';

  export const GATEWAY =
    process.env.AXUM_GATEWAY_URL ??
    process.env.NEXT_PUBLIC_GATEWAY_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.CATALOGUE_URL ??
    'http://127.0.0.1:8080';

