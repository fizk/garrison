import { jwtVerify } from 'jose';
import type { ValidationHandler } from '../handlers';

export function validateJWT (fetchSecret: () => Promise<string>): ValidationHandler  {
    return async ([method, headers, params, query, args]) => {
        if (!headers.authorization) throw new Error('No Authorization header provided');
        if (headers.authorization.startsWith("Bearer ")) {
            const key = await fetchSecret();
            const secret = new TextEncoder().encode(key)
            const jwtResult = await jwtVerify(headers.authorization.substring(7, headers.authorization.length), secret);
            return Promise.resolve([method, headers, params, query, jwtResult.payload]);
        }
        throw new Error('Authorization header does not start with "Bearer "');
    }
}

export function getJWTSecretFromEnv (): Promise<string> {
    return Promise.resolve(process.env.JWT_SECRET || '');
}
