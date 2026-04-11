import fs from 'node:fs/promises';
import * as path from 'path';
import { DetectionRule, Skill, SkillLevel } from '../types';
import { analyzeTypeScript, ASTCounts } from './ast';

// ---------------------------------------------------------------------------
// Detection rules — one entry per skill, per language.
// patterns are regex strings; all are tested case-insensitively.
// weight (1–3) amplifies the raw match count: a weight-3 match is rarer
// and more diagnostic than a weight-1 match, so each hit counts more.
// ---------------------------------------------------------------------------
const RULES: DetectionRule[] = [

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
function ext(filePath: string): string {
    const i = filePath.lastIndexOf('.');
    return i !== -1 ? filePath.slice(i).toLowerCase() : '';
}

/**
 * Confidence score on a log2 scale.
 * avgPerFile = 1 → ~50 %, avgPerFile = 3 → ~79 %, avgPerFile = 7 → ~100 %
 */
function confidence(totalCount: number, relevantFileCount: number, weight: number): number {
    if (totalCount === 0) { return 0; }
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

function isIgnored(filePath: string): boolean {
    return filePath.split(/[\\/]/).some(segment => IGNORED_DIRS.has(segment));
}

export async function detect(projectPath: string): Promise<Skill[]> {
    const allEntries = await fs.readdir(projectPath, { recursive: true });

    const SUPPORTED = new Set(['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs', '.py', '.go', '.java', '.cs', '.rs', '.rb', '.php']);
    const codeFiles = (allEntries as string[]).filter(f =>
        SUPPORTED.has(ext(f)) && !isIgnored(f)
    );

    const withStats = await Promise.all(
        codeFiles.map(async f => ({
            file: f,
            stat: await fs.stat(path.join(projectPath, f)),
        }))
    );

    // Read files sequentially in batches to avoid EMFILE (too many open files)
    const validFiles = withStats.filter(f => f.stat.isFile());
    const filesContent: { file: string; ext: string; text: string }[] = [];
    const BATCH_SIZE = 20;
    for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
        const batch = validFiles.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            batch.map(async f => ({
                file: f.file,
                ext: ext(f.file),
                text: await fs.readFile(path.join(projectPath, f.file), 'utf-8'),
            }))
        );
        filesContent.push(...results);
    }

    const TS_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
    const tsFiles  = filesContent.filter(f => TS_EXTS.has(f.ext));

    // ── AST pass for TypeScript/JavaScript files ───────────────────────────
    // Accumulate counts across all TS/JS files keyed by skill name
    const astTotals: ASTCounts = {};
    for (const f of tsFiles) {
        const counts = analyzeTypeScript(f.text, f.file);
        for (const [skill, count] of Object.entries(counts)) {
            astTotals[skill] = (astTotals[skill] ?? 0) + count;
        }
    }

    const now = new Date().toISOString();
    const results: Skill[] = [];

    // ── Emit AST-derived skills (TS/JS only) ──────────────────────────────
    const AST_SKILL_META: Record<string, { language: string; weight: number }> = {
        'Async / Await':                 { language: 'JavaScript/TypeScript', weight: 2 },
        'Arrow Functions':               { language: 'JavaScript/TypeScript', weight: 1 },
        'Destructuring':                 { language: 'JavaScript/TypeScript', weight: 1 },
        'TypeScript Interfaces & Types': { language: 'TypeScript',            weight: 2 },
        'TypeScript Generics':           { language: 'TypeScript',            weight: 3 },
        'Classes & OOP':                 { language: 'JavaScript/TypeScript', weight: 2 },
        'Error Handling':                { language: 'JavaScript/TypeScript', weight: 1 },
        'Promises':                      { language: 'JavaScript/TypeScript', weight: 2 },
        'ES Modules':                    { language: 'JavaScript/TypeScript', weight: 1 },
        'Array Methods':                 { language: 'JavaScript/TypeScript', weight: 1 },
        'React Hooks':                   { language: 'React',                 weight: 2 },
        'React Components (JSX)':        { language: 'React',                 weight: 1 },
    };

    for (const [skillName, meta] of Object.entries(AST_SKILL_META)) {
        const total = astTotals[skillName] ?? 0;
        if (total === 0) {continue;}
        const score = confidence(total, tsFiles.length, meta.weight);
        results.push({
            name: skillName,
            language: meta.language,
            level: score >= 60 ? SkillLevel.Knows : SkillLevel.Learning,
            confidence: score,
            usageCount: total,
            lastSeenAt: now,
        });
    }

    // ── Regex pass for all other languages ────────────────────────────────
    const NON_TS_RULES = RULES.filter(r =>
        !r.fileTypes.every(ft => TS_EXTS.has(ft))
    );

    for (const rule of NON_TS_RULES) {
        const relevantFiles = filesContent.filter(f =>
            rule.fileTypes.includes(f.ext) && !TS_EXTS.has(f.ext)
        );
        if (relevantFiles.length === 0) {continue;}

        const regexes = rule.patterns.map(p => new RegExp(p, 'gim'));
        let totalCount = 0;
        for (const f of relevantFiles) {
            for (const re of regexes) {
                re.lastIndex = 0;
                const matches = f.text.match(re);
                if (matches) {totalCount += matches.length;}
            }
        }

        if (totalCount === 0) {continue;}

        const score = confidence(totalCount, relevantFiles.length, rule.weight);
        results.push({
            name: rule.name,
            language: rule.language,
            level: score >= 60 ? SkillLevel.Knows : SkillLevel.Learning,
            confidence: score,
            usageCount: totalCount,
            lastSeenAt: now,
        });
    }

    return results;
}
