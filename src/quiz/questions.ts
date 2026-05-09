import type { ConceptId } from '../types/index';

export interface QuizQuestion {
    concept: ConceptId;
    snippet: string;
    prompt: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
    {
        concept: 'closures',
        snippet: `
function makeAdder(x: number) {
  return function (y: number): number {
    return x + y;
  };
}

const add5 = makeAdder(5);
const add10 = makeAdder(10);

console.log(add5(3));   // 8
console.log(add10(3));  // 13
console.log(add5(3));   // still 8
`.trim(),
        prompt:
            'What does `makeAdder` return, and why does `add5` still know about `x` after `makeAdder` has finished running? Why write it this way instead of just passing both numbers each time?',
    },

    {
        concept: 'async-model',
        snippet: `
console.log('A');

async function getData(): Promise<string> {
  console.log('B');
  const result = await fetch('/api/data');
  console.log('C');
  return result.json();
}

getData();
console.log('D');
`.trim(),
        prompt:
            'What order do A, B, C, D print in — and why? What does the JavaScript runtime do between B and C that makes this different from ordinary function calls?',
    },

    {
        concept: 'pure-functions',
        snippet: `
type Item = { name: string; price: number };

function total(items: Item[], taxRate: number): number {
  return items.reduce((sum, item) => sum + item.price, 0) * (1 + taxRate);
}

const cart = [{ name: 'book', price: 12 }, { name: 'pen', price: 2 }];

console.log(total(cart, 0.1)); // 15.4
console.log(total(cart, 0.1)); // 15.4
console.log(cart);             // unchanged
`.trim(),
        prompt:
            'What property does `total` have that makes it reliable to call multiple times? What would have to change about this function for that property to break — and why does that matter when testing or reasoning about your code?',
    },

    {
        concept: 'immutability',
        snippet: `
type Settings = {
  theme: 'light' | 'dark';
  fontSize: number;
  sidebar: boolean;
};

function withTheme(settings: Settings, theme: 'light' | 'dark'): Settings {
  return { ...settings, theme };
}

const defaults: Settings = { theme: 'light', fontSize: 14, sidebar: true };
const dark = withTheme(defaults, 'dark');

console.log(defaults.theme); // 'light'
console.log(dark.theme);     // 'dark'
`.trim(),
        prompt:
            'Why does `withTheme` return a new object instead of doing `settings.theme = theme`? What problem would that direct assignment cause in a React component — and how does the approach here avoid it?',
    },

    {
        concept: 'component-composition',
        snippet: `
function Badge({ count }: { count: number }) {
  return <span className="badge">{count}</span>;
}

function Avatar({ src, name }: { src: string; name: string }) {
  return <img src={src} alt={name} className="avatar" />;
}

function UserCard({ user, unread }: { user: User; unread: number }) {
  return (
    <div className="card">
      <Avatar src={user.avatarUrl} name={user.name} />
      <span>{user.name}</span>
      <Badge count={unread} />
    </div>
  );
}
`.trim(),
        prompt:
            'Why are `Badge` and `Avatar` written as separate components instead of putting that markup directly inside `UserCard`? What does this approach make easier — and what would you have to change if you needed a `Badge` somewhere else in the app?',
    },

    {
        concept: 'async-error-handling',
        snippet: `
async function loadUser(id: string): Promise<User | null> {
  try {
    const res = await fetch(\`/api/users/\${id}\`);
    if (!res.ok) {
      throw new Error(\`Request failed: \${res.status}\`);
    }
    return await res.json();
  } catch (err) {
    console.error('loadUser failed:', err);
    return null;
  }
}
`.trim(),
        prompt:
            'What kinds of failures does the `try/catch` here actually catch — and what happens if you removed it and a network error occurred? Why does the function check `res.ok` separately from the `catch` block?',
    },

    {
        concept: 'separation-of-concerns',
        snippet: `
function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  return { users, loading };
}

function UserList() {
  const { users, loading } = useUsers();
  if (loading) return <p>Loading...</p>;
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
`.trim(),
        prompt:
            'Why is the data-fetching logic in `useUsers` instead of directly inside `UserList`? What would be harder if you put the `useEffect` and `useState` calls directly in the component — and what does the split make easier?',
    },
];
