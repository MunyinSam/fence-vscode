// fixture.ts — deliberate patterns at every tier for scanner testing.
// Each section is labelled with what it should trigger.

// ── Tier 1: basicTypes, simpleInterfaces, typedFunctions ──────────────────

interface User {
  name: string;
  age: number;
  active: boolean;
}

function greet(user: User): string {
  return user.name;
}

// ── Tier 2: unionTypes, consumingGenerics, optionalChaining, nullishCoalescing

type Id = string | number;

function processIds(ids: Array<string>): Promise<void> {
  return Promise.resolve();
}

function getName(user: User | null): string {
  return user?.name ?? 'anonymous';
}

// ── Tier 3: writingGenerics, typeGuards, utilityTypes, discriminatedUnions, asyncAwait

function identity<T>(x: T): T {
  return x;
}

function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function updateUser(updates: Partial<User>): User {
  return { name: updates.name ?? '', age: updates.age ?? 0, active: true };
}

type Circle = { kind: 'circle'; radius: number };
type Square = { kind: 'square'; side: number };
type Shape = Circle | Square;

function describeShape(shape: Shape): string {
  switch (shape.kind) {
    case 'circle': return `circle r=${shape.radius}`;
    case 'square': return `square s=${shape.side}`;
    default: return 'unknown';
  }
}

async function fetchUser(id: string): Promise<User> {
  try {
    const data = await Promise.resolve<User>({ name: 'test', age: 0, active: true });
    return data;
  } catch (err) {
    throw err;
  }
}

// ── Tier 4: conditionalTypes, mappedTypes, inferKeyword, constrainedGenerics, templateLiteralTypes

type IsString<T> = T extends string ? true : false;

type ReadonlyClone<T> = { readonly [K in keyof T]: T[K] };

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

type EventName = `on${string}`;

// ── Tier 5: recursiveTypes ────────────────────────────────────────────────

type JSONValue = string | number | boolean | null | JSONValue[] | { [k: string]: JSONValue };

// ── Anti-patterns ─────────────────────────────────────────────────────────
// anyUsage: 2 (param + return), anyAsReturnType: 1, eslintDisable: 1

function riskyFn(x: any): any { // eslint-disable-line
  return x;
}

// tsIgnore: 1
// @ts-ignore
const badAnnotation: string = 123 as unknown as string;

// unsafeAssertion: 1
function unsafeGet(val: unknown): string {
  return val as string;
}

// emptyCatch: 1
function swallowError(): void {
  try {
    riskyFn(null);
  } catch (e) {}
}

// ── Modern syntax: varDeclarations, callbackNesting ───────────────────────

// varDeclarations: 1
// eslint-disable-next-line no-var
var legacyVar = 'old school';

// callbackNesting: 1 (outer callback contains an inner callback argument)
setTimeout(function() {
  setTimeout(function() {
    console.log('nested');
  }, 100);
}, 100);

// ── Idioms: arrayMethods, destructuring, forLoopsOnArrays ─────────────────

const nums = [1, 2, 3];
const doubled = nums.map(n => n * 2);    // arrayMethods +1
const evens = nums.filter(n => n % 2 === 0); // arrayMethods +1

const { name, age } = { name: 'test', age: 1 };    // ObjectBindingPattern +1
const [first, second] = [1, 2];                      // ArrayBindingPattern +1

for (let i = 0; i < nums.length; i++) { // forLoopsOnArrays +1
  console.log(nums[i]);
}
