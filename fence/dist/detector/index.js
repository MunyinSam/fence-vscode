"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detect = detect;
const promises_1 = __importDefault(require("node:fs/promises"));
const path = __importStar(require("path"));
const types_1 = require("../types");
// ---------------------------------------------------------------------------
// Detection rules — one entry per skill, per language.
// patterns are regex strings; all are tested case-insensitively.
// weight (1–3) amplifies the raw match count: a weight-3 match is rarer
// and more diagnostic than a weight-1 match, so each hit counts more.
// ---------------------------------------------------------------------------
const RULES = [
    // ── JavaScript / TypeScript ─────────────────────────────────────────────
    {
        name: 'Async / Await',
        language: 'JavaScript/TypeScript',
        patterns: ['\\basync\\s+(function\\b|\\(|[a-z_$])', '\\bawait\\s+\\w'],
        fileTypes: ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'],
        weight: 2,
    },
    {
        name: 'Arrow Functions',
        language: 'JavaScript/TypeScript',
        patterns: ['\\([^)]*\\)\\s*=>', '\\b\\w+\\s*=>'],
        fileTypes: ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'],
        weight: 1,
    },
    {
        name: 'Destructuring',
        language: 'JavaScript/TypeScript',
        patterns: ['(const|let|var)\\s*\\{', '(const|let|var)\\s*\\['],
        fileTypes: ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'],
        weight: 1,
    },
    {
        name: 'Promises',
        language: 'JavaScript/TypeScript',
        patterns: ['new\\s+Promise\\(', '\\.then\\s*\\(', 'Promise\\.(all|race|allSettled|any)\\('],
        fileTypes: ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'],
        weight: 2,
    },
    {
        name: 'Error Handling',
        language: 'JavaScript/TypeScript',
        patterns: ['\\btry\\s*\\{', '\\bcatch\\s*\\(\\w', '\\.catch\\s*\\(', 'new\\s+Error\\('],
        fileTypes: ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'],
        weight: 1,
    },
    {
        name: 'ES Modules',
        language: 'JavaScript/TypeScript',
        patterns: ['\\bimport\\s*\\{', '\\bimport\\s+\\w+\\s+from\\b', '\\bexport\\s+(default\\s+)?\\w'],
        fileTypes: ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'],
        weight: 1,
    },
    {
        name: 'Classes & OOP',
        language: 'JavaScript/TypeScript',
        patterns: ['\\bclass\\s+[A-Z]\\w*', '\\bextends\\s+[A-Z]\\w*', '\\bnew\\s+[A-Z]\\w*\\('],
        fileTypes: ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'],
        weight: 2,
    },
    {
        name: 'TypeScript Interfaces & Types',
        language: 'TypeScript',
        patterns: ['\\binterface\\s+\\w+', '\\btype\\s+\\w+\\s*=', ':\\s*(string|number|boolean|void|never|any)\\b'],
        fileTypes: ['.ts', '.tsx'],
        weight: 2,
    },
    {
        name: 'TypeScript Generics',
        language: 'TypeScript',
        patterns: ['<[A-Z]\\w*>', 'Array<\\w+>', 'Promise<\\w+>', 'Record<\\w+,\\s*\\w+>', 'Partial<\\w+>'],
        fileTypes: ['.ts', '.tsx'],
        weight: 3,
    },
    {
        name: 'React Hooks',
        language: 'React',
        patterns: ['\\buseState\\b', '\\buseEffect\\b', '\\buseCallback\\b', '\\buseMemo\\b', '\\buseRef\\b', '\\buseContext\\b'],
        fileTypes: ['.tsx', '.jsx'],
        weight: 2,
    },
    {
        name: 'React Components (JSX)',
        language: 'React',
        patterns: ['return\\s*\\(\\s*<', '<[A-Z]\\w+', '\\bJSX\\.Element\\b', 'React\\.FC'],
        fileTypes: ['.tsx', '.jsx'],
        weight: 1,
    },
    {
        name: 'Array Methods',
        language: 'JavaScript/TypeScript',
        patterns: ['\\.map\\s*\\(', '\\.filter\\s*\\(', '\\.reduce\\s*\\(', '\\.find\\s*\\(', '\\.flatMap\\s*\\('],
        fileTypes: ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'],
        weight: 1,
    },
    // ── Python ──────────────────────────────────────────────────────────────
    {
        name: 'Type Hints',
        language: 'Python',
        patterns: [
            'def\\s+\\w+\\s*\\([^)]*:\\s*(str|int|float|bool|list|dict|tuple|Any)',
            '->\\s*(str|int|float|bool|None|list|dict)',
            'from\\s+typing\\s+import',
            ':\\s*(str|int|float|bool)\\s*=',
        ],
        fileTypes: ['.py'],
        weight: 2,
    },
    {
        name: 'Decorators',
        language: 'Python',
        patterns: ['@\\w+', '@property', '@staticmethod', '@classmethod', '@\\w+\\.\\w+'],
        fileTypes: ['.py'],
        weight: 2,
    },
    {
        name: 'List / Dict Comprehensions',
        language: 'Python',
        patterns: ['\\[.+\\bfor\\b.+\\bin\\b', '\\{.+\\bfor\\b.+\\bin\\b'],
        fileTypes: ['.py'],
        weight: 2,
    },
    {
        name: 'Context Managers',
        language: 'Python',
        patterns: ['\\bwith\\s+\\w+.*\\bas\\b', 'def\\s+__enter__', 'contextlib\\.'],
        fileTypes: ['.py'],
        weight: 2,
    },
    {
        name: 'Classes & OOP',
        language: 'Python',
        patterns: ['\\bclass\\s+\\w+', 'def\\s+__init__\\s*\\(', '\\bself\\.\\w+', '\\bsuper\\(\\)'],
        fileTypes: ['.py'],
        weight: 1,
    },
    {
        name: 'Generators',
        language: 'Python',
        patterns: ['\\byield\\b', '\\byield\\s+from\\b', 'def\\s+__iter__', 'def\\s+__next__'],
        fileTypes: ['.py'],
        weight: 3,
    },
    {
        name: 'Async / Await',
        language: 'Python',
        patterns: ['\\basync\\s+def\\b', '\\bawait\\s+\\w', '\\basyncio\\.'],
        fileTypes: ['.py'],
        weight: 2,
    },
    {
        name: 'Exception Handling',
        language: 'Python',
        patterns: ['\\btry\\s*:', '\\bexcept\\s+\\w', '\\braise\\s+\\w', '\\bfinally\\s*:'],
        fileTypes: ['.py'],
        weight: 1,
    },
    {
        name: 'f-strings',
        language: 'Python',
        patterns: ['f["\'].*\\{\\w', "f['\"].*\\{\\w"],
        fileTypes: ['.py'],
        weight: 1,
    },
    {
        name: 'Lambda & Functional',
        language: 'Python',
        patterns: ['\\blambda\\s+\\w+', '\\bmap\\s*\\(', '\\bfilter\\s*\\(', '\\bfunctools\\.'],
        fileTypes: ['.py'],
        weight: 2,
    },
    // ── Go ──────────────────────────────────────────────────────────────────
    {
        name: 'Goroutines',
        language: 'Go',
        patterns: ['\\bgo\\s+func\\b', '\\bgo\\s+\\w+\\('],
        fileTypes: ['.go'],
        weight: 3,
    },
    {
        name: 'Channels',
        language: 'Go',
        patterns: ['\\bchan\\s+\\w+', '<-\\s*\\w+', '\\w+\\s*<-', 'make\\s*\\(chan'],
        fileTypes: ['.go'],
        weight: 3,
    },
    {
        name: 'Error Handling',
        language: 'Go',
        patterns: ['if\\s+err\\s*!=\\s*nil', '\\bfmt\\.Errorf\\b', '\\berrors\\.New\\b', 'return.*\\berr\\b'],
        fileTypes: ['.go'],
        weight: 2,
    },
    {
        name: 'Interfaces',
        language: 'Go',
        patterns: ['\\binterface\\s*\\{', 'type\\s+\\w+\\s+interface'],
        fileTypes: ['.go'],
        weight: 2,
    },
    {
        name: 'Structs & Methods',
        language: 'Go',
        patterns: ['\\btype\\s+\\w+\\s+struct\\b', 'func\\s*\\(\\w+\\s+\\*?\\w+\\)\\s+\\w+'],
        fileTypes: ['.go'],
        weight: 1,
    },
    {
        name: 'Defer',
        language: 'Go',
        patterns: ['\\bdefer\\s+\\w'],
        fileTypes: ['.go'],
        weight: 2,
    },
    {
        name: 'Select & Concurrency',
        language: 'Go',
        patterns: ['\\bselect\\s*\\{', '\\bsync\\.\\w+', '\\bsync/atomic\\b'],
        fileTypes: ['.go'],
        weight: 3,
    },
    // ── Java ────────────────────────────────────────────────────────────────
    {
        name: 'Streams & Lambdas',
        language: 'Java',
        patterns: ['\\.stream\\s*\\(\\)', '\\.filter\\s*\\(', '\\.map\\s*\\(', '\\.collect\\s*\\(', '->'],
        fileTypes: ['.java'],
        weight: 2,
    },
    {
        name: 'Generics',
        language: 'Java',
        patterns: ['List<\\w+>', 'Map<\\w+,\\s*\\w+>', 'Optional<\\w+>', 'ArrayList<\\w+>', '<[A-Z]\\w*>'],
        fileTypes: ['.java'],
        weight: 2,
    },
    {
        name: 'Exception Handling',
        language: 'Java',
        patterns: ['\\btry\\s*\\{', '\\bcatch\\s*\\(\\w+\\s+\\w+\\)', '\\bthrows\\s+\\w+', 'new\\s+\\w+Exception'],
        fileTypes: ['.java'],
        weight: 1,
    },
    {
        name: 'Annotations',
        language: 'Java',
        patterns: ['@Override', '@Autowired', '@Component', '@Service', '@Repository', '@SpringBootApplication', '@Test'],
        fileTypes: ['.java'],
        weight: 2,
    },
    {
        name: 'OOP & Inheritance',
        language: 'Java',
        patterns: ['\\bextends\\s+[A-Z]\\w+', '\\bimplements\\s+[A-Z]\\w+', '\\binterface\\s+[A-Z]\\w+'],
        fileTypes: ['.java'],
        weight: 1,
    },
    // ── C# ──────────────────────────────────────────────────────────────────
    {
        name: 'LINQ',
        language: 'C#',
        patterns: ['\\.Where\\s*\\(', '\\.Select\\s*\\(', '\\.FirstOrDefault\\s*\\(', '\\.OrderBy\\s*\\(', '\\bfrom\\s+\\w+\\s+in\\s+'],
        fileTypes: ['.cs'],
        weight: 3,
    },
    {
        name: 'Async / Await',
        language: 'C#',
        patterns: ['\\basync\\s+Task\\b', '\\bawait\\s+\\w', '\\basync\\s+Task<'],
        fileTypes: ['.cs'],
        weight: 2,
    },
    {
        name: 'Generics',
        language: 'C#',
        patterns: ['List<\\w+>', 'Dictionary<\\w+,\\s*\\w+>', 'IEnumerable<\\w+>', 'Task<\\w+>'],
        fileTypes: ['.cs'],
        weight: 2,
    },
    {
        name: 'Properties & Accessors',
        language: 'C#',
        patterns: ['\\{\\s*get;', '\\{\\s*get;\\s*set;', '\\{\\s*get;\\s*private\\s+set;'],
        fileTypes: ['.cs'],
        weight: 1,
    },
    {
        name: 'Null Handling',
        language: 'C#',
        patterns: ['\\?\\?\\s', '\\?\\.', '\\w+\\?\\s+', '\\bis null\\b', '\\bis not null\\b'],
        fileTypes: ['.cs'],
        weight: 2,
    },
    {
        name: 'Pattern Matching',
        language: 'C#',
        patterns: ['\\bswitch\\s*\\(', '\\bwhen\\s*\\(', '\\bis\\s+[A-Z]\\w+\\s+\\w+', '\\bcase\\s+[A-Z]\\w+\\s+\\w+:'],
        fileTypes: ['.cs'],
        weight: 3,
    },
    // ── Rust ────────────────────────────────────────────────────────────────
    {
        name: 'Ownership & Borrowing',
        language: 'Rust',
        patterns: ['&mut\\s+\\w', '&\\w+', 'Box<\\w+>', 'Rc<\\w+>', 'Arc<\\w+>'],
        fileTypes: ['.rs'],
        weight: 3,
    },
    {
        name: 'Pattern Matching',
        language: 'Rust',
        patterns: ['\\bmatch\\s+\\w', '\\bif\\s+let\\s+', '\\bwhile\\s+let\\s+'],
        fileTypes: ['.rs'],
        weight: 2,
    },
    {
        name: 'Error Handling',
        language: 'Rust',
        patterns: ['Result<\\w+', 'Option<\\w+', '\\.unwrap\\(', '\\.expect\\(', '\\bErr\\(', '\\bOk\\('],
        fileTypes: ['.rs'],
        weight: 2,
    },
    {
        name: 'Traits & Impl',
        language: 'Rust',
        patterns: ['\\btrait\\s+\\w+', '\\bimpl\\s+\\w+', 'impl\\s+\\w+\\s+for\\s+\\w+'],
        fileTypes: ['.rs'],
        weight: 2,
    },
    {
        name: 'Closures & Iterators',
        language: 'Rust',
        patterns: ['\\|\\w*\\|\\s*\\{', '\\bmove\\s*\\|', '\\.iter\\(\\)', '\\.map\\s*\\(|', '\\.collect\\s*\\('],
        fileTypes: ['.rs'],
        weight: 2,
    },
    {
        name: 'Lifetimes',
        language: 'Rust',
        patterns: ["'[a-z]\\b", "fn\\s+\\w+<'[a-z]", "<'[a-z],"],
        fileTypes: ['.rs'],
        weight: 3,
    },
    // ── Ruby ────────────────────────────────────────────────────────────────
    {
        name: 'Blocks & Enumerables',
        language: 'Ruby',
        patterns: ['\\bdo\\s*\\|\\w', '\\{\\s*\\|\\w', '\\.each\\s*(\\{|do)', '\\.map\\s*(\\{|do)', '\\.select\\s*(\\{|do)'],
        fileTypes: ['.rb'],
        weight: 1,
    },
    {
        name: 'Modules & Mixins',
        language: 'Ruby',
        patterns: ['\\bmodule\\s+[A-Z]\\w*', '\\binclude\\s+[A-Z]\\w*', '\\bextend\\s+[A-Z]\\w*', '\\bprepend\\s+[A-Z]\\w*'],
        fileTypes: ['.rb'],
        weight: 2,
    },
    {
        name: 'Metaprogramming',
        language: 'Ruby',
        patterns: ['\\battr_accessor\\b', '\\battr_reader\\b', '\\bmethod_missing\\b', '\\bdefine_method\\b', '\\bsend\\s*\\('],
        fileTypes: ['.rb'],
        weight: 3,
    },
    {
        name: 'Exception Handling',
        language: 'Ruby',
        patterns: ['\\brescue\\b', '\\braise\\b', '\\bbegin\\b', '\\bensure\\b'],
        fileTypes: ['.rb'],
        weight: 1,
    },
    {
        name: 'Procs & Lambdas',
        language: 'Ruby',
        patterns: ['\\bProc\\.new\\b', '\\blambda\\s*\\{', '->\\s*\\(', '&:\\w+'],
        fileTypes: ['.rb'],
        weight: 2,
    },
    // ── PHP ─────────────────────────────────────────────────────────────────
    {
        name: 'Namespaces & Use',
        language: 'PHP',
        patterns: ['\\bnamespace\\s+\\w', '\\buse\\s+\\w+\\\\\\w'],
        fileTypes: ['.php'],
        weight: 2,
    },
    {
        name: 'Type Declarations',
        language: 'PHP',
        patterns: [
            'function\\s+\\w+\\s*\\([^)]*\\b(string|int|float|bool|array)\\s+\\$',
            ':\\s*(string|int|float|bool|array|void)\\b',
            '\\?(string|int|float|bool)',
        ],
        fileTypes: ['.php'],
        weight: 2,
    },
    {
        name: 'Null Safe & Coalescing',
        language: 'PHP',
        patterns: ['\\?->', '\\?\\?(?!=)', '\\?\\?='],
        fileTypes: ['.php'],
        weight: 2,
    },
    {
        name: 'Traits',
        language: 'PHP',
        patterns: ['\\btrait\\s+\\w+', '\\buse\\s+\\w+;'],
        fileTypes: ['.php'],
        weight: 2,
    },
    {
        name: 'Arrow Functions',
        language: 'PHP',
        patterns: ['\\bfn\\s*\\(', 'array_map\\s*\\(', 'array_filter\\s*\\('],
        fileTypes: ['.php'],
        weight: 1,
    },
];
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Extract file extension including the dot, lowercased. */
function ext(filePath) {
    const i = filePath.lastIndexOf('.');
    return i !== -1 ? filePath.slice(i).toLowerCase() : '';
}
/**
 * Confidence score on a log2 scale.
 * avgPerFile = 1 → ~50 %, avgPerFile = 3 → ~79 %, avgPerFile = 7 → ~100 %
 */
function confidence(totalCount, relevantFileCount, weight) {
    if (totalCount === 0)
        return 0;
    const avg = (totalCount * weight) / Math.max(relevantFileCount, 1);
    return Math.min(100, Math.round(Math.log2(avg + 1) * 50));
}
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const IGNORED_DIRS = new Set([
    'node_modules', 'dist', 'out', 'build', '.git', '.svn',
    'coverage', '.next', '.nuxt', '.cache', 'vendor', '__pycache__',
    'target', 'bin', '.venv', 'venv', 'env',
]);
function isIgnored(filePath) {
    return filePath.split(/[\\/]/).some(segment => IGNORED_DIRS.has(segment));
}
async function detect(projectPath) {
    const allEntries = await promises_1.default.readdir(projectPath, { recursive: true });
    const SUPPORTED = new Set(['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs', '.py', '.go', '.java', '.cs', '.rs', '.rb', '.php']);
    const codeFiles = allEntries.filter(f => SUPPORTED.has(ext(f)) && !isIgnored(f));
    const withStats = await Promise.all(codeFiles.map(async (f) => ({
        file: f,
        stat: await promises_1.default.stat(path.join(projectPath, f)),
    })));
    // Read files sequentially in batches to avoid EMFILE (too many open files)
    const validFiles = withStats.filter(f => f.stat.isFile());
    const filesContent = [];
    const BATCH_SIZE = 20;
    for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
        const batch = validFiles.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(async (f) => ({
            file: f.file,
            ext: ext(f.file),
            text: await promises_1.default.readFile(path.join(projectPath, f.file), 'utf-8'),
        })));
        filesContent.push(...results);
    }
    const results = [];
    for (const rule of RULES) {
        const relevantFiles = filesContent.filter(f => rule.fileTypes.includes(f.ext));
        if (relevantFiles.length === 0)
            continue;
        // Compile all patterns once per rule
        const regexes = rule.patterns.map(p => new RegExp(p, 'gim'));
        let totalCount = 0;
        for (const f of relevantFiles) {
            for (const re of regexes) {
                re.lastIndex = 0;
                const matches = f.text.match(re);
                if (matches)
                    totalCount += matches.length;
            }
        }
        if (totalCount === 0)
            continue;
        const score = confidence(totalCount, relevantFiles.length, rule.weight);
        const level = score >= 60 ? types_1.SkillLevel.Knows : types_1.SkillLevel.Learning;
        results.push({
            name: rule.name,
            language: rule.language,
            level,
            confidence: score,
            usageCount: totalCount,
        });
    }
    return results;
}
//# sourceMappingURL=index.js.map