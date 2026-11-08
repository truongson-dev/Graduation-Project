import { z } from 'zod';

/**
 * Validate build-time configuration once, at boot.
 *
 * A bad VITE_API_URL must fail loudly here instead of producing 404s on every
 * screen. Defaults mirror .env.example.
 */
const envSchema = z.object({
  VITE_API_URL: z.union([
    z.url(),
    z.string().regex(/^\/(?!\/)/, 'Phải là URL tuyệt đối hoặc đường dẫn bắt đầu bằng /'),
  ]).default('/api'),
  VITE_API_VERSION: z.string().min(1).default('v1'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');

  throw new Error(`Cấu hình môi trường không hợp lệ — ${details}`);
}

export const env = parsed.data;
