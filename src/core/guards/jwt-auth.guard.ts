import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwksRsa from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly jwksClient: jwksRsa.JwksClient;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.jwksClient = jwksRsa({
      jwksUri: this.configService.get<string>('supabase.jwksUri')!,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600_000,
      rateLimit: true,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const payload = await this.verifyToken(token);
    const user = await this.usersService.findOrCreate({
      supabaseUserId: payload.sub!,
      email: payload['email'] as string,
      name: (payload['user_metadata']?.['full_name'] as string) ?? (payload['email'] as string),
    });

    (request as unknown as Record<string, unknown>).user = user;
    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.slice(7);
  }

  private async verifyToken(token: string): Promise<jwt.JwtPayload> {
    let signingKey: string;

    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        throw new UnauthorizedException('Invalid token structure');
      }
      const key = await this.jwksClient.getSigningKey(decoded.header.kid);
      signingKey = key.getPublicKey();
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`JWKS key fetch failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Unable to verify token signature');
    }

    try {
      const payload = jwt.verify(token, signingKey, {
        algorithms: ['ES256'],
        issuer: this.configService.get<string>('supabase.jwtIssuer'),
        audience: this.configService.get<string>('supabase.jwtAudience'),
      }) as jwt.JwtPayload;

      if (!payload.sub || !payload['email']) {
        throw new UnauthorizedException('Token missing required claims');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`Token verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
