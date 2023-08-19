import { assertEquals, assertRejects } from "https://deno.land/std@0.198.0/assert/mod.ts";
import { validateBasicAuth } from '../../src/validators/basicAuth.ts';
import { decode, encode } from "https://deno.land/std@0.198.0/encoding/base64.ts";
import {
    assertSpyCall,
    assertSpyCalls,
    spy,
  } from "https://deno.land/std@0.198.0/testing/mock.ts";

Deno.test("No auth header provided", () => {
    const request = new Request('https://some/url.com');
    assertRejects(() => {
        return validateBasicAuth(() => Promise.resolve(false))([request, null, null]);
    }, Error, 'No Authorization header provided')
});


Deno.test("No Basic auth header provided", () => {
    const request = new Request('https://some/url.com', {
        headers: {
            Authorization: 'Bearer invalid'
        }
    });
    assertRejects(() => {
        return validateBasicAuth(() => Promise.resolve(false))([request, null, null]);
    }, Error, 'Authorization header does not start with "Basic "')
});

Deno.test("Valid Basic header", async () => {
    const usernamePasswordHash = encode('myusername:mypassword');
    const request = new Request('https://some/url.com', {
        headers: {
            Authorization: `Basic ${usernamePasswordHash}`
        }
    });
    
    const validationFunction = (_username: string, _password: string) => Promise.resolve(true)
    const validationFunctionSpy = spy(validationFunction);

    await validateBasicAuth(validationFunctionSpy)([request, null, null]);

    assertSpyCall(validationFunctionSpy, 0, {
        args: ['myusername', 'mypassword'],
        returned: Promise.resolve(true),
      });
});

Deno.test("Valid Basic header but credential dont match", () => {
    const usernamePasswordHash = encode('myusername:mypassword');
    const request = new Request('https://some/url.com', {
        headers: {
            Authorization: `Basic ${usernamePasswordHash}`
        }
    });
    
    const validationFunction = (_username: string, _password: string) => Promise.resolve(false)
    
    assertRejects(() => {
        return validateBasicAuth(validationFunction)([request, null, null]);
    }, Error, 'Invalid username and/or password for BasicAuth')
});

Deno.test("Valid Basic header but hash in incorrect format", async () => {
    const usernamePasswordHash = encode('myusernamemypassword');
    const request = new Request('https://some/url.com', {
        headers: {
            Authorization: `Basic ${usernamePasswordHash}`
        }
    });
    
    const validationFunction = (_username: string, _password: string) => Promise.resolve(false)
    const validationFunctionSpy = spy(validationFunction);

    await assertRejects(() => {
        return validateBasicAuth(validationFunctionSpy)([request, null, null]);
    }, Error, 'Invalid username and/or password for BasicAuth');

    assertSpyCall(validationFunctionSpy, 0, {
        args: ['myusernamemypassword', undefined as unknown as string],
        returned: Promise.resolve(true),
    });
});