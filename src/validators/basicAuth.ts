import type { ValidationHandler } from '../types.ts';
import { decode } from "https://deno.land/std@0.198.0/encoding/base64.ts";

export const validateBasicAuth = (validateCredentials: (username: string, password: string) => Promise<boolean>): ValidationHandler<[string, string]> => async ([request, params, _args]) => {
    if (!request.headers.get('Authorization')) throw new Error('No Authorization header provided');
    if (request.headers.get('Authorization')?.startsWith("Basic ")) {
        const base64UsernamePassword = request.headers.get('Authorization')?.substring(6, request.headers.get('Authorization')?.length);
        const [username, password] = new TextDecoder().decode(decode(base64UsernamePassword!)).split(':');
        const isValid = await validateCredentials(username, password);
        if (isValid) return Promise.resolve([request, params, [username, password]]);
        else throw new Error('Invalid username and/or password for BasicAuth')
    }
    throw new Error('Authorization header does not start with "Basic "');
}

export function getBasicAuthFromEnv (username: string, password: string): Promise<boolean> {
    const remoteUsername = Deno.env.get('BASIC_AUTH_USERNAME') || '';
    const remotePassword = Deno.env.get('BASIC_AUTH_PASSWORD') || '';
    return Promise.resolve(
        `${remoteUsername}:${remotePassword}` === `${username}:${password}`
    );
}
