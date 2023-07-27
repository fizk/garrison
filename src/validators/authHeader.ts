import { validateJWT } from './jwt';
import type { ValidatePayload } from './jwt';
import { validateBasicAuth } from './basicAuth';
import type { ValidateUser } from './basicAuth';
import type { ValidationHandler, Maybe } from '../handlers';

type Options = {
    jwt:    [() => Promise<string>] | 
            [() => Promise<string>, ValidatePayload],
    basic:  [(username: string, password: string) => Promise<[string, string]>] | 
            [(username: string, password: string) => Promise<[string, string]>, ValidateUser],
    fallback?: ValidationHandler
}

export function validateAuthHeader(options: Options): ValidationHandler {
    return async (method, headers, params, query) => {

        if (headers?.authorization?.startsWith("Basic ")) {
            return validateBasicAuth(options.basic[0], options.basic[1])(method, headers, params, query)
        }
        else if (headers?.authorization?.startsWith("Bearer ")) {
            return validateJWT(options.jwt[0], options.jwt[1])(method, headers, params, query);
        } 
        else {
            console.log(options.fallback );
            return options.fallback 
                ? options.fallback(method, headers, params, query) 
                : Promise.resolve(false);
        }
    }
}