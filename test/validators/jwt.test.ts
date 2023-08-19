import { assertEquals, assertRejects } from "https://deno.land/std@0.198.0/assert/mod.ts";
import { validateJWT } from '../../src/validators/jwt.ts';
import { JWSInvalid, JWTExpired } from "https://deno.land/x/jose@v4.14.4/util/errors.ts";
import { importPKCS8 } from "https://deno.land/x/jose@v4.14.4/key/import.ts";
import { SignJWT } from "https://deno.land/x/jose@v4.14.4/index.ts";

const VALID_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxZqlbdy6WZiRKD1eZ21n
6ScDbV4X6ewrUtHtmOAw6XS1ncku0CL82GY0NwJYVbhm5W81+Mr4OAis7ICfIKp3
jS84w0mqMOsFc9XuQTeO1H7ZO2AMCM75J3sikOZzgCKTD9aVLQwvznwqP7kWWo+/
6wTJ9nH+V7QHgUWX9CoyUfa72HE6FDZ89NZpID6SklHUfVc3KQmNs69bAlqdGdLp
UcoekOV1oBDs6jzgVqOi77tC6WNlo9nC6J6uuraHq9QtD61VIXryXP2WUfUSFMzF
lvQm3ht4v3jlRGaV4TcjzBY4JiHN64ZpzfXJAtQF8gXuKodPaXZ6ujYIplVOU3Lj
xwIDAQAB
-----END PUBLIC KEY-----`;

const VALID_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDFmqVt3LpZmJEo
PV5nbWfpJwNtXhfp7CtS0e2Y4DDpdLWdyS7QIvzYZjQ3AlhVuGblbzX4yvg4CKzs
gJ8gqneNLzjDSaow6wVz1e5BN47Uftk7YAwIzvkneyKQ5nOAIpMP1pUtDC/OfCo/
uRZaj7/rBMn2cf5XtAeBRZf0KjJR9rvYcToUNnz01mkgPpKSUdR9VzcpCY2zr1sC
Wp0Z0ulRyh6Q5XWgEOzqPOBWo6Lvu0LpY2Wj2cLonq66toer1C0PrVUhevJc/ZZR
9RIUzMWW9CbeG3i/eOVEZpXhNyPMFjgmIc3rhmnN9ckC1AXyBe4qh09pdnq6Ngim
VU5TcuPHAgMBAAECggEBAMH5Tb0ruO4smwmCPIKQ3jj8KBwbCqSBRgH1uyOfp8Pz
4jhyffao8cVHhqgdMDNtYeyFH9kK/WCb+4vpsssxK0w3d6QUUvHUMzUDYu84J4gm
wP3NCeM3sVL1R/gvkF/PEMeyYBupY+Bw+FQ3T180zzNYLx0xx3e2bMuUUlbHeUAE
l67qJsf3Lribld4HIAGozJeMwfIiQtkSlGjdDgAm5q2qR65lEfnvhSVYLAWD6Arb
khpagdOK4APu32txFELCnuPGXr9Jx0hf5vwMW2wOYdWnDOrX/rDWxQpyO99ok/Ln
UIyroxuLqd75YKAIkluhSZ3acOOwuafE+sjx5fPQKMkCgYEA5iFMUUvPdhoVL3/h
wkcmRFYMx+0R1MKrTAa7VCDjf1SumVqztqJ97Nx+1BP6Tfw0MVgz4BqFwWHLhnVz
zPahX9XOW+g9MxGtLqIkkrG0FKmQlnnqBEsi/D0uec7e5/kmMtp/CJlBQIVfIFpr
u4C15yWxe/B9XKjb90Pi+olNJMUCgYEA29FQC8vSIHRDSVaVHNIAW+BHYmfKczcF
msQMrCTBbxaA50llOYdnMRtj3RlaSO9LkP4PihCOxyayi6sJgBLS4tkU4QPSMEgd
Lp6xtDXpjorFP93lc8RFFA0t14B6UqjDkvpzEmVGtB1ZN1Nsvff+Rpp+CjQIijH4
uF87inA+JxsCgYAmKZdyU9QPjbu9qMNTaGEcK/jqnpG6ap3leahPBzUyxGQ/4h6z
RrcDNH2DxdxYWl59YFcZ7swHiaQqpAeUEcIpFlemPhkIAwJpHVJbUUS/uG7VxVnd
ZGhk0/CFGp00csi23iz6zA9aF8PypYwACBQiRMnt96+SUh5IHuXhDivQ0QKBgQCs
+Wnmzm28ciCcrlBKTIpRwgwKSKhLv6leXxWlxIqekvO+jMfl3EH8p5QO4Stlp0As
iW/K8jqYRkBLnbytFqLyNWazpmEY8zZbgC9QIvh13YdYOZGcZn8BR1micgxPzVOQ
7hntCNr5UvroiXJRjrt97YZvGwD5VldlJjNhPe/6rwKBgEDs2gMqIrjI+cH8UMHq
GN5eZ6TbSboV/naxkBYn6DoEhBswr5tGKcbQczGuDzZX/lLjCxGNsfHRWAQ/QcHn
GOS/FeBG4HrjIRjpknKjVd+gs7cJYuarWJAnTAMwm5wlfgaUyM2OsgxmnEB47in0
LN2UqU1duKp1VBDfLtYLw0+U
-----END PRIVATE KEY-----`;

Deno.test("No auth header provided", () => {
    const request = new Request('https://some/url.com');
    assertRejects(() => {
        return validateJWT(() => Promise.resolve(''))([request, null, null] );
    }, Error, 'No Authorization header provided');
});

Deno.test("Auth header is not Bearer", () => {
    const request = new Request('https://some/url.com', {
        headers: {
            Authorization: 'Basic '
        }
    });
    assertRejects(() => {
        return validateJWT(() => Promise.resolve(''))([request, null, null] );
    }, Error, 'Authorization header does not start with "Bearer "');
});

Deno.test("Invalid SPKI key", () => {
    const request = new Request('https://some/url.com', {
        headers: {
            Authorization: 'Bearer invalid'
        }
    });
    assertRejects(() => {
        return validateJWT(() => Promise.resolve('invalid'))([request, null, null] );
    }, TypeError, '"spki" must be SPKI formatted string');
});

Deno.test("Invalid JWT token", () => {

    const request = new Request('https://some/url.com', {
        headers: {
            Authorization: 'Bearer invalid'
        }
    });
    assertRejects(() => {
        return validateJWT(() => Promise.resolve(VALID_PUBLIC_KEY))([request, null, null] );
    }, JWSInvalid, 'Invalid Compact JWS');
});

Deno.test("Valid JWT token", async () => {
    const refreshExpireDays = 90;
    const refreshTime = new Date();
    refreshTime.setDate(refreshTime.getDate() + refreshExpireDays);
    const expireRefreshTime = Math.trunc(refreshTime.getTime() / 1000);

    const privateKeyLike = await importPKCS8(VALID_PRIVATE_KEY, 'RS256');

    const lastJTI = 'lastJTI';
    const userObj = {
        id: 'string',
        username: 'string',
        email: 'string',
        created_on: 123,
        attributes: {}
    };
    const currentRefreshToken = await new SignJWT({})
        .setProtectedHeader({ alg: 'RS256' })
        .setSubject(userObj.id)
        .setIssuedAt()
        .setJti(lastJTI)
        .setExpirationTime(expireRefreshTime)
        .sign(privateKeyLike);
    
    const request = new Request('https://some/url.com', {
        headers: {
            Authorization: `Bearer ${currentRefreshToken}`
        }
    });
    const [_request, _params, payload] = await validateJWT(() => Promise.resolve(VALID_PUBLIC_KEY))([request, null, null] );

    assertEquals(payload?.sub, userObj.id);
    assertEquals(payload?.jti, lastJTI);

});

Deno.test("JWT token expired", async () => {
    
    const privateKeyLike = await importPKCS8(VALID_PRIVATE_KEY, 'RS256');

    const lastJTI = 'lastJTI';
    const userObj = {
        id: 'string',
        username: 'string',
        email: 'string',
        created_on: 123,
        attributes: {}
    };
    const currentRefreshToken = await new SignJWT({})
        .setProtectedHeader({ alg: 'RS256' })
        .setSubject(userObj.id)
        .setIssuedAt()
        .setJti(lastJTI)
        .setExpirationTime(0)
        .sign(privateKeyLike);
    
    const request = new Request('https://some/url.com', {
        headers: {
            Authorization: `Bearer ${currentRefreshToken}`
        }
    });

    assertRejects(() => {
        return validateJWT(() => Promise.resolve(VALID_PUBLIC_KEY))([request, null, null] );
    }, JWTExpired, '"exp" claim timestamp check failed');
});