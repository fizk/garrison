import { jwtVerify, importSPKI } from 'https://deno.land/x/jose@v4.14.4/index.ts';
import { type JWTPayload } from "https://deno.land/x/jose@v4.14.4/index.ts";
import type { ValidationHandler } from '../types.ts';

export function validateJWT (fetchSecret: () => Promise<string>): ValidationHandler<JWTPayload>  {
    return async ([request, params, _args]) => {
        if (!request.headers.get('authorization')) throw new Error('No Authorization header provided');
        if (request.headers.get('authorization')?.startsWith("Bearer ")) {
            const key = await fetchSecret();
            const refreshPublicKeyLike = await importSPKI(key, 'RS256');
            const jwtResult = await jwtVerify(
                (request.headers.get('authorization') || '')?.substring(7, request.headers.get('authorization')?.length),
                refreshPublicKeyLike
            );
            return Promise.resolve([request, params, jwtResult.payload as JWTPayload]);
        }
        throw new Error('Authorization header does not start with "Bearer "');
    }
}

export function getKeyFromEnv(): Promise<string> {
    return Promise.resolve(Deno.env.get('JWT_KEY')!)
}
