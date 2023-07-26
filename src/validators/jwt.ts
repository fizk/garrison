import { JWTPayload, jwtVerify } from 'jose';
import type { IncomingHttpHeaders } from 'http';
import type { ValidationHandler, Maybe } from '../handlers';

export type ValidatePayload = (
    method: Maybe<string>, 
    headers: IncomingHttpHeaders, 
    params: Maybe<Record<string, string>>, 
    query: Maybe<Record<string, string> | undefined>,
    payload: JWTPayload
) => Promise<boolean>;

export function validateJWT (fetchSecret: () => Promise<string>, validatePayload?: ValidatePayload): ValidationHandler  {
    return async (method, headers, params, query) => {

            if (!headers.authorization) return Promise.resolve(false);

            if (headers.authorization.startsWith("Bearer ")) {
                const key = await fetchSecret();
                try {
                    const payload = await parseJWT(
                        headers.authorization.substring(7, headers.authorization.length),
                        key
                    );
                    if (validatePayload) {
                        return validatePayload(method, headers, params, query, payload);
                    } else {
                        return Promise.resolve(true);
                    }
                } catch {
                    return Promise.resolve(false);
                }
            }
           return Promise.resolve(false);
    }
}

export function getJWTSecretFromEnv (): Promise<string> {
    return Promise.resolve(process.env.JWT_SECRET || '');
}


async function parseJWT(jwt: string, key: string): Promise<JWTPayload> {
    const secret = new TextEncoder().encode(key)

    try{
        const jwtResult = await jwtVerify(jwt, secret);
        if (jwtResult && jwtResult.payload) return Promise.resolve(jwtResult.payload);
        else return Promise.reject();
    } catch (error) {
        return Promise.reject();
    }
}