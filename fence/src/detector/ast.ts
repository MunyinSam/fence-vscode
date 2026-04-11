import * as ts from 'typescript';

// Map from skill name → how many times we saw it in this file
export type ASTCounts = Record<string, number>;

const ARRAY_METHODS = new Set(['map', 'filter', 'reduce', 'find', 'findIndex', 'flatMap', 'some', 'every', 'flat']);
const REACT_HOOKS   = new Set(['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext', 'useReducer', 'useLayoutEffect']);
const PROMISE_STATICS = new Set(['all', 'race', 'allSettled', 'any']);

export function analyzeTypeScript(text: string, fileName: string): ASTCounts {
    const counts: ASTCounts = {
        'Async / Await':                 0,
        'Arrow Functions':               0,
        'Destructuring':                 0,
        'TypeScript Interfaces & Types': 0,
        'TypeScript Generics':           0,
        'Classes & OOP':                 0,
        'Error Handling':                0,
        'Promises':                      0,
        'ES Modules':                    0,
        'Array Methods':                 0,
        'React Hooks':                   0,
        'React Components (JSX)':        0,
    };

    const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);

    function walk(node: ts.Node): void {
        // ── Async / Await ──────────────────────────────────────────────────
        if (ts.isAwaitExpression(node)) {
            counts['Async / Await']++;
        }
        if (
            (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
             ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
            ts.canHaveModifiers(node)
        ) {
            const mods = ts.getModifiers(node);
            if (mods?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
                counts['Async / Await']++;
            }
        }

        // ── Arrow Functions ────────────────────────────────────────────────
        if (ts.isArrowFunction(node)) {
            counts['Arrow Functions']++;
        }

        // ── Destructuring ──────────────────────────────────────────────────
        if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) {
            counts['Destructuring']++;
        }

        // ── TypeScript Interfaces & Types ──────────────────────────────────
        if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
            counts['TypeScript Interfaces & Types']++;
        }

        // ── TypeScript Generics ────────────────────────────────────────────
        if (
            (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) ||
             ts.isMethodDeclaration(node)   || ts.isClassDeclaration(node) ||
             ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
            (node as ts.FunctionDeclaration).typeParameters?.length
        ) {
            counts['TypeScript Generics']++;
        }
        // Generic call: foo<Bar>()
        if (ts.isCallExpression(node) && node.typeArguments?.length) {
            counts['TypeScript Generics']++;
        }

        // ── Classes & OOP ──────────────────────────────────────────────────
        if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
            counts['Classes & OOP']++;
        }
        if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
            const name = node.expression.text;
            if (/^[A-Z]/.test(name)) {
                counts['Classes & OOP']++;
            }
        }

        // ── Error Handling ─────────────────────────────────────────────────
        if (ts.isTryStatement(node)) {
            counts['Error Handling']++;
        }

        // ── Call expressions (Promises, Array methods, React Hooks) ────────
        if (ts.isCallExpression(node)) {
            const expr = node.expression;

            if (ts.isPropertyAccessExpression(expr)) {
                const name = expr.name.text;

                if (name === 'then' || name === 'catch' || name === 'finally') {
                    counts['Promises']++;
                }
                if (ARRAY_METHODS.has(name)) {
                    counts['Array Methods']++;
                }
                if (REACT_HOOKS.has(name)) {
                    counts['React Hooks']++;
                }
                // Promise.all / Promise.race / etc.
                if (
                    ts.isIdentifier(expr.expression) &&
                    expr.expression.text === 'Promise' &&
                    PROMISE_STATICS.has(name)
                ) {
                    counts['Promises']++;
                }
            }

            // Direct hook call: useState(...)
            if (ts.isIdentifier(expr) && REACT_HOOKS.has(expr.text)) {
                counts['React Hooks']++;
            }
        }

        // new Promise(...)
        if (
            ts.isNewExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === 'Promise'
        ) {
            counts['Promises']++;
        }

        // ── ES Modules ─────────────────────────────────────────────────────
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
            counts['ES Modules']++;
        }

        // ── React JSX ──────────────────────────────────────────────────────
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
            counts['React Components (JSX)']++;
        }

        ts.forEachChild(node, walk);
    }

    walk(source);
    return counts;
}
