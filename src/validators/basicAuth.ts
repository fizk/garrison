import type { ValidationHandler } from '../handlers';

export const validateBasicAuth = (validateCredentials: (username: string, password: string) => Promise<boolean>): ValidationHandler => async ([method, headers, params, query]) => {
    if (!headers.authorization) throw new Error('No Authorization header provided');
    if (headers.authorization.startsWith("Basic ")) {
        const base64UsernamePassword = headers.authorization.substring(6, headers.authorization.length);
        const [username, password] = Buffer.from(base64UsernamePassword, 'base64').toString('utf-8').split(':');
        const isValid = await validateCredentials(username, password);
        if (isValid) return Promise.resolve([method, headers, params, query, [username, password]]);
    }
    throw new Error('Authorization header does not start with "Basic "');
}

export function getBasicAuthFromEnv (username: string, password: string): Promise<boolean> {
    const remoteUsername = process.env.BASIC_AUTH_USERNAME || '';
    const remotePassword = process.env.BASIC_AUTH_PASSWORD || '';
    return Promise.resolve(
        `${remoteUsername}:${remotePassword}` === `${username}:${password}`
    );
}