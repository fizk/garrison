import { IncomingHttpHeaders } from 'http';
import type { ValidationHandler, Maybe } from '../handlers';

export type ValidateUser = (
    method: Maybe<string>, 
    headers: IncomingHttpHeaders, 
    params: Maybe<Record<string, string>>, 
    query: Maybe<Record<string, string> | undefined>,
    user: {
        username: string
        password: string
    }
) => Promise<boolean>;

export function validateBasicAuth (fetchCredentials: (username: string, password: string) => Promise<[string, string]>, validateUser?: ValidateUser): ValidationHandler  {
    return async (method, headers, params, query) => {

            if (!headers.authorization) return Promise.resolve(false);

            if (headers.authorization.startsWith("Basic ")) {
                const base64UsernamePassword = headers.authorization.substring(6, headers.authorization.length);
                const [providedUserName, providedPassword] = Buffer.from(base64UsernamePassword, 'base64').toString('utf-8').split(':');

                try {
                    const [username, password] = await fetchCredentials(providedUserName, providedPassword);
                    if (`${username}:${password}` !== `${providedUserName}:${providedPassword}`) {
                        throw new Error();
                    }
                    return !!validateUser
                        ?  validateUser(method, headers, params, query, {username, password})
                        : Promise.resolve(true);
                } catch {
                    return Promise.resolve(false);
                }
            }
           return Promise.resolve(false);
    }
}

export function getBasicAuthFromEnv (username: string, password: string): Promise<[string, string]> {
    return Promise.resolve([process.env.BASIC_AUTH_USERNAME || '', process.env.BASIC_AUTH_PASSWORD || ''])
}