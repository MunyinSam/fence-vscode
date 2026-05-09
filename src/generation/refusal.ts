import type { ConceptId } from '../types/index';

interface RefusalContent {
    explanation: string;
    example: string;
    resource: string;
}

const CONTENT: Record<ConceptId, RefusalContent> = {
    'closures': {
        explanation: `A closure is what happens when a function remembers variables from the place where it was created, even after that place has finished running. When you return a function from another function, the inner function carries those outer variables with it — they don't disappear.`,
        example: `
function makeGreeter(name: string) {
  // 'name' is captured — the returned function remembers it
  return function () {
    console.log(\`Hello, \${name}\`);
  };
}

const greetAlice = makeGreeter('Alice');
greetAlice(); // "Hello, Alice" — name is still accessible
`.trim(),
        resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures',
    },

    'async-model': {
        explanation: `JavaScript runs one thing at a time. When you \`await\` something, your function pauses and hands control back to the runtime — it doesn't freeze the whole program. Other code can run while it waits. \`async/await\` is just cleaner syntax for Promises; under the hood, the same thing is happening.`,
        example: `
console.log('1 — before');

async function fetchData() {
  console.log('2 — inside, before await');
  await new Promise(resolve => setTimeout(resolve, 0));
  console.log('4 — inside, after await');
}

fetchData();
console.log('3 — after calling fetchData');

// Prints: 1, 2, 3, 4
// '3' runs before '4' because await yields control
`.trim(),
        resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop',
    },

    'pure-functions': {
        explanation: `A pure function always returns the same output for the same input, and doesn't change anything outside itself. It doesn't modify variables, write to a database, or call an API. This makes it completely predictable — you can call it anywhere, test it in isolation, and trust it won't cause surprises.`,
        example: `
// Pure — same input always gives same output, nothing is changed
function add(a: number, b: number): number {
  return a + b;
}

// Impure — reads external state, result can change
let total = 0;
function addToTotal(n: number): number {
  total += n; // modifies something outside the function
  return total;
}
`.trim(),
        resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions',
    },

    'immutability': {
        explanation: `Immutability means not changing data after it's created — producing a new copy instead. In React, you must never modify state directly (\`state.count++\`) because React won't detect the change and won't re-render. You always create a new object or array and pass it to the setter.`,
        example: `
const [user, setUser] = useState({ name: 'Alice', age: 25 });

// Wrong — mutates the existing object, React won't notice
user.age = 26;
setUser(user);

// Correct — creates a new object with the updated field
setUser({ ...user, age: 26 });
`.trim(),
        resource: 'https://react.dev/learn/updating-objects-in-state',
    },

    'component-composition': {
        explanation: `Component composition means building UI from small, focused components that each do one thing — then assembling them into larger ones. Instead of one giant component that handles everything, you write pieces that can be understood, tested, and reused independently.`,
        example: `
// Each piece does one thing
function Avatar({ src }: { src: string }) {
  return <img src={src} className="avatar" />;
}

function UserName({ name }: { name: string }) {
  return <span>{name}</span>;
}

// The parent assembles the pieces
function UserCard({ user }: { user: User }) {
  return (
    <div>
      <Avatar src={user.avatarUrl} />
      <UserName name={user.name} />
    </div>
  );
}
`.trim(),
        resource: 'https://react.dev/learn/thinking-in-react',
    },

    'async-error-handling': {
        explanation: `Async operations can fail — the network might be down, the server might return an error, or the response might be malformed. Without handling these cases, your app silently breaks or crashes. \`try/catch\` catches thrown errors inside async functions; you also need to manually check \`response.ok\` because \`fetch\` only throws on network failure, not on a 404 or 500.`,
        example: `
async function getUser(id: string) {
  try {
    const res = await fetch(\`/api/users/\${id}\`);

    // fetch doesn't throw on 404/500 — you check manually
    if (!res.ok) {
      throw new Error(\`Server error: \${res.status}\`);
    }

    return await res.json();
  } catch (err) {
    console.error('Failed to load user:', err);
    return null;
  }
}
`.trim(),
        resource: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch',
    },

    'separation-of-concerns': {
        explanation: `Separation of concerns means keeping different types of work in different places. In React, data fetching belongs in a custom hook or service — not directly inside a component. When you mix fetching and rendering in one place, the component becomes hard to test, hard to reuse, and hard to change without breaking something else.`,
        example: `
// Data fetching lives in a hook
function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(id).then(setUser);
  }, [id]);

  return user;
}

// The component only handles rendering
function UserProfile({ id }: { id: string }) {
  const user = useUser(id);
  if (!user) return <p>Loading…</p>;
  return <h1>{user.name}</h1>;
}
`.trim(),
        resource: 'https://react.dev/learn/reusing-logic-with-custom-hooks',
    },
};

export function buildRefusalMessage(concept: ConceptId): string {
    const { explanation, example, resource } = CONTENT[concept];

    return `
**fence didn't generate code for this request.**

To write this code, you'd need a working understanding of **${concept}** — and your explanation didn't show that yet. That's not a problem; here's what to know first.

---

**What ${concept} means**

${explanation}

**A minimal example**

\`\`\`typescript
${example}
\`\`\`

**Where to learn more**

${resource}

---

Once you've read through it, ask \`@fence\` again. If you can explain what's happening and why, it'll generate the code.
`.trim();
}
