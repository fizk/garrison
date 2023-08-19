import { assertEquals } from "https://deno.land/std@0.198.0/assert/mod.ts";

Deno.test("url test1", () => {
    const pattern = new URLPattern({pathname: '/post'});
	const actual = pattern.test('https://rapidapi.com/post');
    const expected = true;

    assertEquals(actual , expected);
});

Deno.test("url test2", () => {
    const pattern = new URLPattern({pathname: '/post'});
	const actual = pattern.test('https://rapidapi.com/post/1');
    const expected = false;

    assertEquals(actual , expected);
});

Deno.test("url test3", () => {
    const pattern = new URLPattern({pathname: '/post/:id'});
	const actual = pattern.test('https://rapidapi.com/post/1');
    const expected = true;

    assertEquals(actual , expected);
});

Deno.test("url test4", () => {
    const pattern = new URLPattern({
        protocol: 'https',
        username: '',
        password: '',
        hostname: '*',
        port: '',
        pathname: '/post',
        search: '*'
      });

	const actual = pattern.test('https://rapidapi.com/post?q=3');
    const expected = true;

    assertEquals(actual , expected);
});

Deno.test("url test5", () => {
    const pattern = new URLPattern({
        protocol: '*',
        username: '',
        password: '',
        hostname: '*',
        port: '',
        pathname: '/post/:id',
        search: '*'
      });

	const actual = pattern.test('https://rapidapi.com/post/1');
    const expected = true;

    const expectedGrups = {id: '1'};
    const actualGroups = pattern.exec('https://rapidapi.com/post/1')?.pathname.groups;

    assertEquals(actual , expected);
    assertEquals(actualGroups , expectedGrups);
});
Deno.test("url test6", () => {
    const pattern = new URLPattern({
        hostname: '*',
        pathname: '/cv',
        search: '*'
      });

	const actual = pattern.test('https://localhost:3030/cv?q=2');
    const expected = true;


    assertEquals(actual , expected);
});
