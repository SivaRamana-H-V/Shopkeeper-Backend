import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
}));

export const supabaseConfig = registerAs('supabase', () => ({
  url: process.env.SUPABASE_URL,
  jwtIssuer: process.env.SUPABASE_JWT_ISSUER,
  jwtAudience: process.env.SUPABASE_JWT_AUDIENCE ?? 'authenticated',
  jwksUri: `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
}));
