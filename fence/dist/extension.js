"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));

// src/detector/index.ts
var import_promises = __toESM(require("node:fs/promises"));
var path = __toESM(require("path"));

// src/detector/ast.ts
var ts = __toESM(require("typescript"));
var ARRAY_METHODS = /* @__PURE__ */ new Set(["map", "filter", "reduce", "find", "findIndex", "flatMap", "some", "every", "flat"]);
var REACT_HOOKS = /* @__PURE__ */ new Set(["useState", "useEffect", "useCallback", "useMemo", "useRef", "useContext", "useReducer", "useLayoutEffect"]);
var PROMISE_STATICS = /* @__PURE__ */ new Set(["all", "race", "allSettled", "any"]);
function analyzeTypeScript(text, fileName) {
  const counts = {
    "Async / Await": 0,
    "Arrow Functions": 0,
    "Destructuring": 0,
    "TypeScript Interfaces & Types": 0,
    "TypeScript Generics": 0,
    "Classes & OOP": 0,
    "Error Handling": 0,
    "Promises": 0,
    "ES Modules": 0,
    "Array Methods": 0,
    "React Hooks": 0,
    "React Components (JSX)": 0
  };
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  function walk(node) {
    if (ts.isAwaitExpression(node)) {
      counts["Async / Await"]++;
    }
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && ts.canHaveModifiers(node)) {
      const mods = ts.getModifiers(node);
      if (mods?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
        counts["Async / Await"]++;
      }
    }
    if (ts.isArrowFunction(node)) {
      counts["Arrow Functions"]++;
    }
    if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)) {
      counts["Destructuring"]++;
    }
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      counts["TypeScript Interfaces & Types"]++;
    }
    if ((ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.typeParameters?.length) {
      counts["TypeScript Generics"]++;
    }
    if (ts.isCallExpression(node) && node.typeArguments?.length) {
      counts["TypeScript Generics"]++;
    }
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      counts["Classes & OOP"]++;
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (/^[A-Z]/.test(name)) {
        counts["Classes & OOP"]++;
      }
    }
    if (ts.isTryStatement(node)) {
      counts["Error Handling"]++;
    }
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        const name = expr.name.text;
        if (name === "then" || name === "catch" || name === "finally") {
          counts["Promises"]++;
        }
        if (ARRAY_METHODS.has(name)) {
          counts["Array Methods"]++;
        }
        if (REACT_HOOKS.has(name)) {
          counts["React Hooks"]++;
        }
        if (ts.isIdentifier(expr.expression) && expr.expression.text === "Promise" && PROMISE_STATICS.has(name)) {
          counts["Promises"]++;
        }
      }
      if (ts.isIdentifier(expr) && REACT_HOOKS.has(expr.text)) {
        counts["React Hooks"]++;
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Promise") {
      counts["Promises"]++;
    }
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      counts["ES Modules"]++;
    }
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      counts["React Components (JSX)"]++;
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
  return counts;
}

// src/git.ts
var import_node_child_process = require("node:child_process");
var import_node_util = require("node:util");
var exec = (0, import_node_util.promisify)(import_node_child_process.execFile);
async function getCurrentUserEmail(cwd) {
  try {
    const { stdout } = await exec("git", ["config", "user.email"], { cwd });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}
async function getMyCommittedFiles(cwd, userEmail) {
  try {
    const { stdout } = await exec("git", [
      "log",
      `--author=${userEmail}`,
      "--pretty=format:",
      "--name-only",
      "--diff-filter=ACMR"
    ], { cwd });
    const files = /* @__PURE__ */ new Set();
    for (const line of stdout.split("\n")) {
      const f = line.trim();
      if (f) {
        files.add(f);
        files.add(f.replace(/\\/g, "/"));
      }
    }
    return files;
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
async function getMyLineNumbers(filePath, cwd, userEmail) {
  try {
    const { stdout } = await exec("git", ["blame", "-e", "--", filePath], { cwd });
    const owned = /* @__PURE__ */ new Set();
    stdout.split("\n").forEach((line, i) => {
      const m = line.match(/<([^>]+)>/);
      if (m && m[1].toLowerCase() === userEmail.toLowerCase()) {
        owned.add(i + 1);
      }
    });
    return owned;
  } catch {
    return null;
  }
}

// src/detector/index.ts
var RULES = [
  // ── JavaScript / TypeScript ─────────────────────────────────────────────
  {
    name: "Async / Await",
    language: "JavaScript/TypeScript",
    patterns: ["\\basync\\s+(function\\b|\\(|[a-z_$])", "\\bawait\\s+\\w"],
    fileTypes: [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"],
    weight: 2
  },
  {
    name: "Arrow Functions",
    language: "JavaScript/TypeScript",
    patterns: ["\\([^)]*\\)\\s*=>", "\\b\\w+\\s*=>"],
    fileTypes: [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"],
    weight: 1
  },
  {
    name: "Destructuring",
    language: "JavaScript/TypeScript",
    patterns: ["(const|let|var)\\s*\\{", "(const|let|var)\\s*\\["],
    fileTypes: [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"],
    weight: 1
  },
  {
    name: "Promises",
    language: "JavaScript/TypeScript",
    patterns: ["new\\s+Promise\\(", "\\.then\\s*\\(", "Promise\\.(all|race|allSettled|any)\\("],
    fileTypes: [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"],
    weight: 2
  },
  {
    name: "Error Handling",
    language: "JavaScript/TypeScript",
    patterns: ["\\btry\\s*\\{", "\\bcatch\\s*\\(\\w", "\\.catch\\s*\\(", "new\\s+Error\\("],
    fileTypes: [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"],
    weight: 1
  },
  {
    name: "ES Modules",
    language: "JavaScript/TypeScript",
    patterns: ["\\bimport\\s*\\{", "\\bimport\\s+\\w+\\s+from\\b", "\\bexport\\s+(default\\s+)?\\w"],
    fileTypes: [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"],
    weight: 1
  },
  {
    name: "Classes & OOP",
    language: "JavaScript/TypeScript",
    patterns: ["\\bclass\\s+[A-Z]\\w*", "\\bextends\\s+[A-Z]\\w*", "\\bnew\\s+[A-Z]\\w*\\("],
    fileTypes: [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"],
    weight: 2
  },
  {
    name: "TypeScript Interfaces & Types",
    language: "TypeScript",
    patterns: ["\\binterface\\s+\\w+", "\\btype\\s+\\w+\\s*=", ":\\s*(string|number|boolean|void|never|any)\\b"],
    fileTypes: [".ts", ".tsx"],
    weight: 2
  },
  {
    name: "TypeScript Generics",
    language: "TypeScript",
    patterns: ["<[A-Z]\\w*>", "Array<\\w+>", "Promise<\\w+>", "Record<\\w+,\\s*\\w+>", "Partial<\\w+>"],
    fileTypes: [".ts", ".tsx"],
    weight: 3
  },
  {
    name: "React Hooks",
    language: "React",
    patterns: ["\\buseState\\b", "\\buseEffect\\b", "\\buseCallback\\b", "\\buseMemo\\b", "\\buseRef\\b", "\\buseContext\\b"],
    fileTypes: [".tsx", ".jsx"],
    weight: 2
  },
  {
    name: "React Components (JSX)",
    language: "React",
    patterns: ["return\\s*\\(\\s*<", "<[A-Z]\\w+", "\\bJSX\\.Element\\b", "React\\.FC"],
    fileTypes: [".tsx", ".jsx"],
    weight: 1
  },
  {
    name: "Array Methods",
    language: "JavaScript/TypeScript",
    patterns: ["\\.map\\s*\\(", "\\.filter\\s*\\(", "\\.reduce\\s*\\(", "\\.find\\s*\\(", "\\.flatMap\\s*\\("],
    fileTypes: [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"],
    weight: 1
  },
  // ── Python ──────────────────────────────────────────────────────────────
  {
    name: "Type Hints",
    language: "Python",
    patterns: [
      "def\\s+\\w+\\s*\\([^)]*:\\s*(str|int|float|bool|list|dict|tuple|Any)",
      "->\\s*(str|int|float|bool|None|list|dict)",
      "from\\s+typing\\s+import",
      ":\\s*(str|int|float|bool)\\s*="
    ],
    fileTypes: [".py"],
    weight: 2
  },
  {
    name: "Decorators",
    language: "Python",
    patterns: ["@\\w+", "@property", "@staticmethod", "@classmethod", "@\\w+\\.\\w+"],
    fileTypes: [".py"],
    weight: 2
  },
  {
    name: "List / Dict Comprehensions",
    language: "Python",
    patterns: ["\\[.+\\bfor\\b.+\\bin\\b", "\\{.+\\bfor\\b.+\\bin\\b"],
    fileTypes: [".py"],
    weight: 2
  },
  {
    name: "Context Managers",
    language: "Python",
    patterns: ["\\bwith\\s+\\w+.*\\bas\\b", "def\\s+__enter__", "contextlib\\."],
    fileTypes: [".py"],
    weight: 2
  },
  {
    name: "Classes & OOP",
    language: "Python",
    patterns: ["\\bclass\\s+\\w+", "def\\s+__init__\\s*\\(", "\\bself\\.\\w+", "\\bsuper\\(\\)"],
    fileTypes: [".py"],
    weight: 1
  },
  {
    name: "Generators",
    language: "Python",
    patterns: ["\\byield\\b", "\\byield\\s+from\\b", "def\\s+__iter__", "def\\s+__next__"],
    fileTypes: [".py"],
    weight: 3
  },
  {
    name: "Async / Await",
    language: "Python",
    patterns: ["\\basync\\s+def\\b", "\\bawait\\s+\\w", "\\basyncio\\."],
    fileTypes: [".py"],
    weight: 2
  },
  {
    name: "Exception Handling",
    language: "Python",
    patterns: ["\\btry\\s*:", "\\bexcept\\s+\\w", "\\braise\\s+\\w", "\\bfinally\\s*:"],
    fileTypes: [".py"],
    weight: 1
  },
  {
    name: "f-strings",
    language: "Python",
    patterns: [`f["'].*\\{\\w`, `f['"].*\\{\\w`],
    fileTypes: [".py"],
    weight: 1
  },
  {
    name: "Lambda & Functional",
    language: "Python",
    patterns: ["\\blambda\\s+\\w+", "\\bmap\\s*\\(", "\\bfilter\\s*\\(", "\\bfunctools\\."],
    fileTypes: [".py"],
    weight: 2
  },
  // ── Go ──────────────────────────────────────────────────────────────────
  {
    name: "Goroutines",
    language: "Go",
    patterns: ["\\bgo\\s+func\\b", "\\bgo\\s+\\w+\\("],
    fileTypes: [".go"],
    weight: 3
  },
  {
    name: "Channels",
    language: "Go",
    patterns: ["\\bchan\\s+\\w+", "<-\\s*\\w+", "\\w+\\s*<-", "make\\s*\\(chan"],
    fileTypes: [".go"],
    weight: 3
  },
  {
    name: "Error Handling",
    language: "Go",
    patterns: ["if\\s+err\\s*!=\\s*nil", "\\bfmt\\.Errorf\\b", "\\berrors\\.New\\b", "return.*\\berr\\b"],
    fileTypes: [".go"],
    weight: 2
  },
  {
    name: "Interfaces",
    language: "Go",
    patterns: ["\\binterface\\s*\\{", "type\\s+\\w+\\s+interface"],
    fileTypes: [".go"],
    weight: 2
  },
  {
    name: "Structs & Methods",
    language: "Go",
    patterns: ["\\btype\\s+\\w+\\s+struct\\b", "func\\s*\\(\\w+\\s+\\*?\\w+\\)\\s+\\w+"],
    fileTypes: [".go"],
    weight: 1
  },
  {
    name: "Defer",
    language: "Go",
    patterns: ["\\bdefer\\s+\\w"],
    fileTypes: [".go"],
    weight: 2
  },
  {
    name: "Select & Concurrency",
    language: "Go",
    patterns: ["\\bselect\\s*\\{", "\\bsync\\.\\w+", "\\bsync/atomic\\b"],
    fileTypes: [".go"],
    weight: 3
  },
  // ── Java ────────────────────────────────────────────────────────────────
  {
    name: "Streams & Lambdas",
    language: "Java",
    patterns: ["\\.stream\\s*\\(\\)", "\\.filter\\s*\\(", "\\.map\\s*\\(", "\\.collect\\s*\\(", "->"],
    fileTypes: [".java"],
    weight: 2
  },
  {
    name: "Generics",
    language: "Java",
    patterns: ["List<\\w+>", "Map<\\w+,\\s*\\w+>", "Optional<\\w+>", "ArrayList<\\w+>", "<[A-Z]\\w*>"],
    fileTypes: [".java"],
    weight: 2
  },
  {
    name: "Exception Handling",
    language: "Java",
    patterns: ["\\btry\\s*\\{", "\\bcatch\\s*\\(\\w+\\s+\\w+\\)", "\\bthrows\\s+\\w+", "new\\s+\\w+Exception"],
    fileTypes: [".java"],
    weight: 1
  },
  {
    name: "Annotations",
    language: "Java",
    patterns: ["@Override", "@Autowired", "@Component", "@Service", "@Repository", "@SpringBootApplication", "@Test"],
    fileTypes: [".java"],
    weight: 2
  },
  {
    name: "OOP & Inheritance",
    language: "Java",
    patterns: ["\\bextends\\s+[A-Z]\\w+", "\\bimplements\\s+[A-Z]\\w+", "\\binterface\\s+[A-Z]\\w+"],
    fileTypes: [".java"],
    weight: 1
  },
  // ── C# ──────────────────────────────────────────────────────────────────
  {
    name: "LINQ",
    language: "C#",
    patterns: ["\\.Where\\s*\\(", "\\.Select\\s*\\(", "\\.FirstOrDefault\\s*\\(", "\\.OrderBy\\s*\\(", "\\bfrom\\s+\\w+\\s+in\\s+"],
    fileTypes: [".cs"],
    weight: 3
  },
  {
    name: "Async / Await",
    language: "C#",
    patterns: ["\\basync\\s+Task\\b", "\\bawait\\s+\\w", "\\basync\\s+Task<"],
    fileTypes: [".cs"],
    weight: 2
  },
  {
    name: "Generics",
    language: "C#",
    patterns: ["List<\\w+>", "Dictionary<\\w+,\\s*\\w+>", "IEnumerable<\\w+>", "Task<\\w+>"],
    fileTypes: [".cs"],
    weight: 2
  },
  {
    name: "Properties & Accessors",
    language: "C#",
    patterns: ["\\{\\s*get;", "\\{\\s*get;\\s*set;", "\\{\\s*get;\\s*private\\s+set;"],
    fileTypes: [".cs"],
    weight: 1
  },
  {
    name: "Null Handling",
    language: "C#",
    patterns: ["\\?\\?\\s", "\\?\\.", "\\w+\\?\\s+", "\\bis null\\b", "\\bis not null\\b"],
    fileTypes: [".cs"],
    weight: 2
  },
  {
    name: "Pattern Matching",
    language: "C#",
    patterns: ["\\bswitch\\s*\\(", "\\bwhen\\s*\\(", "\\bis\\s+[A-Z]\\w+\\s+\\w+", "\\bcase\\s+[A-Z]\\w+\\s+\\w+:"],
    fileTypes: [".cs"],
    weight: 3
  },
  // ── Rust ────────────────────────────────────────────────────────────────
  {
    name: "Ownership & Borrowing",
    language: "Rust",
    patterns: ["&mut\\s+\\w", "&\\w+", "Box<\\w+>", "Rc<\\w+>", "Arc<\\w+>"],
    fileTypes: [".rs"],
    weight: 3
  },
  {
    name: "Pattern Matching",
    language: "Rust",
    patterns: ["\\bmatch\\s+\\w", "\\bif\\s+let\\s+", "\\bwhile\\s+let\\s+"],
    fileTypes: [".rs"],
    weight: 2
  },
  {
    name: "Error Handling",
    language: "Rust",
    patterns: ["Result<\\w+", "Option<\\w+", "\\.unwrap\\(", "\\.expect\\(", "\\bErr\\(", "\\bOk\\("],
    fileTypes: [".rs"],
    weight: 2
  },
  {
    name: "Traits & Impl",
    language: "Rust",
    patterns: ["\\btrait\\s+\\w+", "\\bimpl\\s+\\w+", "impl\\s+\\w+\\s+for\\s+\\w+"],
    fileTypes: [".rs"],
    weight: 2
  },
  {
    name: "Closures & Iterators",
    language: "Rust",
    patterns: ["\\|\\w*\\|\\s*\\{", "\\bmove\\s*\\|", "\\.iter\\(\\)", "\\.map\\s*\\(|", "\\.collect\\s*\\("],
    fileTypes: [".rs"],
    weight: 2
  },
  {
    name: "Lifetimes",
    language: "Rust",
    patterns: ["'[a-z]\\b", "fn\\s+\\w+<'[a-z]", "<'[a-z],"],
    fileTypes: [".rs"],
    weight: 3
  },
  // ── Ruby ────────────────────────────────────────────────────────────────
  {
    name: "Blocks & Enumerables",
    language: "Ruby",
    patterns: ["\\bdo\\s*\\|\\w", "\\{\\s*\\|\\w", "\\.each\\s*(\\{|do)", "\\.map\\s*(\\{|do)", "\\.select\\s*(\\{|do)"],
    fileTypes: [".rb"],
    weight: 1
  },
  {
    name: "Modules & Mixins",
    language: "Ruby",
    patterns: ["\\bmodule\\s+[A-Z]\\w*", "\\binclude\\s+[A-Z]\\w*", "\\bextend\\s+[A-Z]\\w*", "\\bprepend\\s+[A-Z]\\w*"],
    fileTypes: [".rb"],
    weight: 2
  },
  {
    name: "Metaprogramming",
    language: "Ruby",
    patterns: ["\\battr_accessor\\b", "\\battr_reader\\b", "\\bmethod_missing\\b", "\\bdefine_method\\b", "\\bsend\\s*\\("],
    fileTypes: [".rb"],
    weight: 3
  },
  {
    name: "Exception Handling",
    language: "Ruby",
    patterns: ["\\brescue\\b", "\\braise\\b", "\\bbegin\\b", "\\bensure\\b"],
    fileTypes: [".rb"],
    weight: 1
  },
  {
    name: "Procs & Lambdas",
    language: "Ruby",
    patterns: ["\\bProc\\.new\\b", "\\blambda\\s*\\{", "->\\s*\\(", "&:\\w+"],
    fileTypes: [".rb"],
    weight: 2
  },
  // ── PHP ─────────────────────────────────────────────────────────────────
  {
    name: "Namespaces & Use",
    language: "PHP",
    patterns: ["\\bnamespace\\s+\\w", "\\buse\\s+\\w+\\\\\\w"],
    fileTypes: [".php"],
    weight: 2
  },
  {
    name: "Type Declarations",
    language: "PHP",
    patterns: [
      "function\\s+\\w+\\s*\\([^)]*\\b(string|int|float|bool|array)\\s+\\$",
      ":\\s*(string|int|float|bool|array|void)\\b",
      "\\?(string|int|float|bool)"
    ],
    fileTypes: [".php"],
    weight: 2
  },
  {
    name: "Null Safe & Coalescing",
    language: "PHP",
    patterns: ["\\?->", "\\?\\?(?!=)", "\\?\\?="],
    fileTypes: [".php"],
    weight: 2
  },
  {
    name: "Traits",
    language: "PHP",
    patterns: ["\\btrait\\s+\\w+", "\\buse\\s+\\w+;"],
    fileTypes: [".php"],
    weight: 2
  },
  {
    name: "Arrow Functions",
    language: "PHP",
    patterns: ["\\bfn\\s*\\(", "array_map\\s*\\(", "array_filter\\s*\\("],
    fileTypes: [".php"],
    weight: 1
  }
];
function ext(filePath) {
  const i = filePath.lastIndexOf(".");
  return i !== -1 ? filePath.slice(i).toLowerCase() : "";
}
function confidence(totalCount, fileCount, weight, filesWithSkill, patternsHit = 0, totalPatterns = 0) {
  if (totalCount === 0) {
    return 0;
  }
  const avg = totalCount * weight / Math.max(fileCount, 1);
  const freqScore = Math.min(100, Math.log2(avg + 1) * 50);
  const breadthScore = filesWithSkill / Math.max(fileCount, 1) * 100;
  if (totalPatterns === 0) {
    return Math.min(100, Math.round(freqScore * 0.65 + breadthScore * 0.35));
  }
  const diversityScore = patternsHit / totalPatterns * 100;
  return Math.min(100, Math.round(
    freqScore * 0.5 + breadthScore * 0.3 + diversityScore * 0.2
  ));
}
var IGNORED_DIRS = /* @__PURE__ */ new Set([
  "node_modules",
  "dist",
  "out",
  "build",
  ".git",
  ".svn",
  "coverage",
  ".next",
  ".nuxt",
  ".cache",
  "vendor",
  "__pycache__",
  "target",
  "bin",
  ".venv",
  "venv",
  "env"
]);
function isIgnored(filePath) {
  return filePath.split(/[\\/]/).some((segment) => IGNORED_DIRS.has(segment));
}
var SUPPORTED = /* @__PURE__ */ new Set([".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs", ".py", ".go", ".java", ".cs", ".rs", ".rb", ".php"]);
var TS_EXTS = /* @__PURE__ */ new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
async function detect(projectPath, singleFile) {
  let codeFiles;
  if (singleFile) {
    const rel = path.relative(projectPath, singleFile).replace(/\\/g, "/");
    if (isIgnored(rel) || !SUPPORTED.has(ext(singleFile))) {
      return [];
    }
    codeFiles = [rel];
  } else {
    const allEntries = await import_promises.default.readdir(projectPath, { recursive: true });
    codeFiles = allEntries.filter(
      (f) => SUPPORTED.has(ext(f)) && !isIgnored(f)
    );
  }
  const withStats = await Promise.all(
    codeFiles.map(async (f) => ({
      file: f,
      stat: await import_promises.default.stat(path.join(projectPath, f))
    }))
  );
  const validFiles = withStats.filter((f) => f.stat.isFile());
  const filesContent = [];
  const BATCH_SIZE = 20;
  for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
    const batch = validFiles.slice(i, i + BATCH_SIZE);
    const results2 = await Promise.all(
      batch.map(async (f) => ({
        file: f.file,
        ext: ext(f.file),
        text: await import_promises.default.readFile(path.join(projectPath, f.file), "utf-8")
      }))
    );
    filesContent.push(...results2);
  }
  let userEmail = null;
  let myCommittedFiles = /* @__PURE__ */ new Set();
  if (!singleFile) {
    userEmail = await getCurrentUserEmail(projectPath);
    if (userEmail) {
      myCommittedFiles = await getMyCommittedFiles(projectPath, userEmail);
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const results = [];
  const tsFiles = filesContent.filter((f) => TS_EXTS.has(f.ext));
  const tsFilesToScan = userEmail && myCommittedFiles.size > 0 ? tsFiles.filter((f) => {
    const norm = f.file.replace(/\\/g, "/");
    return myCommittedFiles.has(f.file) || myCommittedFiles.has(norm);
  }) : tsFiles;
  const astTotals = {};
  const astBreadth = {};
  for (const f of tsFilesToScan) {
    const counts = analyzeTypeScript(f.text, f.file);
    for (const [skill, count] of Object.entries(counts)) {
      astTotals[skill] = (astTotals[skill] ?? 0) + count;
      if (count > 0) {
        astBreadth[skill] = (astBreadth[skill] ?? 0) + 1;
      }
    }
  }
  const AST_SKILL_META = {
    "Async / Await": { language: "JavaScript/TypeScript", weight: 2 },
    "Arrow Functions": { language: "JavaScript/TypeScript", weight: 1 },
    "Destructuring": { language: "JavaScript/TypeScript", weight: 1 },
    "TypeScript Interfaces & Types": { language: "TypeScript", weight: 2 },
    "TypeScript Generics": { language: "TypeScript", weight: 3 },
    "Classes & OOP": { language: "JavaScript/TypeScript", weight: 2 },
    "Error Handling": { language: "JavaScript/TypeScript", weight: 1 },
    "Promises": { language: "JavaScript/TypeScript", weight: 2 },
    "ES Modules": { language: "JavaScript/TypeScript", weight: 1 },
    "Array Methods": { language: "JavaScript/TypeScript", weight: 1 },
    "React Hooks": { language: "React", weight: 2 },
    "React Components (JSX)": { language: "React", weight: 1 }
  };
  for (const [skillName, meta] of Object.entries(AST_SKILL_META)) {
    const total = astTotals[skillName] ?? 0;
    if (total === 0) {
      continue;
    }
    const score = confidence(
      total,
      tsFilesToScan.length,
      meta.weight,
      astBreadth[skillName] ?? 0
      // no pattern diversity for AST pass
    );
    results.push({
      name: skillName,
      language: meta.language,
      level: score >= 60 ? 0 /* Knows */ : 1 /* Learning */,
      confidence: score,
      usageCount: total,
      editCount: 0,
      // incremented by saveSkills on each save event
      lastSeenAt: now
    });
  }
  const NON_TS_RULES = RULES.filter(
    (r) => !r.fileTypes.every((ft) => TS_EXTS.has(ft))
  );
  for (const rule of NON_TS_RULES) {
    const relevantFiles = filesContent.filter(
      (f) => rule.fileTypes.includes(f.ext) && !TS_EXTS.has(f.ext)
    );
    if (relevantFiles.length === 0) {
      continue;
    }
    const regexes = rule.patterns.map((p) => new RegExp(p, "gi"));
    let totalCount = 0;
    let filesWithSkill = 0;
    const distinctPatternsFired = /* @__PURE__ */ new Set();
    for (const f of relevantFiles) {
      const myLines = userEmail ? await getMyLineNumbers(f.file, projectPath, userEmail) : null;
      const fileLines = f.text.split("\n");
      let fileHits = 0;
      for (let pi = 0; pi < regexes.length; pi++) {
        const re = regexes[pi];
        for (let li = 0; li < fileLines.length; li++) {
          if (myLines !== null && !myLines.has(li + 1)) {
            continue;
          }
          re.lastIndex = 0;
          const m = fileLines[li].match(re);
          if (m) {
            fileHits += m.length;
            distinctPatternsFired.add(pi);
          }
        }
      }
      totalCount += fileHits;
      if (fileHits > 0) {
        filesWithSkill++;
      }
    }
    if (totalCount === 0) {
      continue;
    }
    const score = confidence(
      totalCount,
      relevantFiles.length,
      rule.weight,
      filesWithSkill,
      distinctPatternsFired.size,
      rule.patterns.length
    );
    results.push({
      name: rule.name,
      language: rule.language,
      level: score >= 60 ? 0 /* Knows */ : 1 /* Learning */,
      confidence: score,
      usageCount: totalCount,
      editCount: 0,
      lastSeenAt: now
    });
  }
  return results;
}

// src/generator/index.ts
function confidenceLabel(c) {
  if (c >= 90) {
    return "Expert";
  }
  if (c >= 75) {
    return "Proficient";
  }
  if (c >= 60) {
    return "Comfortable";
  }
  if (c >= 40) {
    return "Familiar";
  }
  return "Exploring";
}
function groupByLanguage(skills) {
  const map = /* @__PURE__ */ new Map();
  for (const s of skills) {
    const list = map.get(s.language) ?? [];
    list.push(s);
    map.set(s.language, list);
  }
  return map;
}
function generate(skills, stressedSkills = /* @__PURE__ */ new Set()) {
  if (skills.length === 0) {
    return `## Purpose

No skills detected yet. Run \`fence init\` inside a project directory.
`;
  }
  const adjusted = skills.map(
    (s) => stressedSkills.has(s.name) ? { ...s, level: 1 /* Learning */ } : s
  );
  const known = adjusted.filter((s) => s.level === 0 /* Knows */);
  const learning = adjusted.filter((s) => s.level === 1 /* Learning */);
  const knownByLang = groupByLanguage(known);
  const learningByLang = groupByLanguage(learning);
  let knownSection = "";
  for (const [lang, list] of knownByLang) {
    knownSection += `
### ${lang}
`;
    for (const s of list.sort((a, b) => b.confidence - a.confidence)) {
      knownSection += `- ${s.name} *(${confidenceLabel(s.confidence)})*
`;
    }
  }
  let learningSection = "";
  for (const [lang, list] of learningByLang) {
    learningSection += `
### ${lang}
`;
    for (const s of list.sort((a, b) => b.confidence - a.confidence)) {
      const stressNote = stressedSkills.has(s.name) ? " *(active errors)*" : "";
      learningSection += `- ${s.name}${stressNote}
`;
    }
  }
  const learningNames = learning.map((s) => `**${s.name}**`).join(", ");
  const learningRulesBlock = learning.length > 0 ? `## Rules for Skills I'm Learning

The following skills appear in my code but I haven't yet mastered them:
${learningNames}

For any of these:
1. Explain the concept \u2014 what it is and why it exists
2. Give a guiding question or minimal hint
3. Let me write the code
4. Only after I've written it, help me fix or improve it

If I ask you to "just write it", push back and ask what part I'm stuck on instead.
` : "";
  return `## Purpose

This file was generated by **fence** \u2014 it maps my demonstrated coding skills so Claude
can calibrate its responses to my actual knowledge level.

## What I Already Know
${knownSection || "\n*(none detected yet)*\n"}
## What I'm Still Learning
${learningSection || "\n*(none detected yet)*\n"}
${learningRulesBlock}## Rules for Claude

**Match my level \u2014 do not use patterns absent from "What I Already Know".**

**You may freely:**
- Fix syntax errors in code I've written
- Explain concepts in plain terms
- Review and correct code I've already written
- Use patterns from "What I Already Know" when filling in small gaps

**You must not:**
- Generate boilerplate or scaffold files on my behalf using skills I'm still learning
- Complete API calls or implementations I haven't started for learning-stage skills
- Write working implementations of skills listed under "Still Learning"

**Confidence levels** indicate how often a pattern appears in my code:
Exploring < Familiar < Comfortable < Proficient < Expert
`;
}

// src/writer/index.ts
var import_promises2 = __toESM(require("node:fs/promises"));
var path2 = __toESM(require("path"));
async function write(projectPath, content) {
  await import_promises2.default.writeFile(path2.join(projectPath, "CLAUDE.md"), content, "utf-8");
}

// src/store/index.ts
var import_promises3 = __toESM(require("node:fs/promises"));
var import_node_os = __toESM(require("node:os"));
var path3 = __toESM(require("path"));
var STORE_PATH = path3.join(import_node_os.default.homedir(), ".fence", "skills.json");
var DECAY_RATE = 5e-3;
function decayedConfidence(storedConfidence, lastSeenAt) {
  const days = (Date.now() - new Date(lastSeenAt).getTime()) / 864e5;
  return Math.round(storedConfidence * Math.pow(1 - DECAY_RATE, days));
}
function editBonus(editCount) {
  return Math.min(15, Math.round(Math.log2(editCount + 1) * 7));
}
function migrate(raw) {
  return {
    name: String(raw.name ?? ""),
    language: String(raw.language ?? "Unknown"),
    level: raw.level === 0 || raw.level === 0 /* Knows */ ? 0 /* Knows */ : 1 /* Learning */,
    confidence: typeof raw.confidence === "number" ? raw.confidence : raw.level === 0 ? 70 : 30,
    usageCount: typeof raw.usageCount === "number" ? raw.usageCount : 0,
    editCount: typeof raw.editCount === "number" ? raw.editCount : 0,
    lastSeenAt: typeof raw.lastSeenAt === "string" ? raw.lastSeenAt : (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function LoadSkills() {
  try {
    const raw = await import_promises3.default.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.map((entry) => {
      const skill = migrate(entry);
      const decayed = decayedConfidence(skill.confidence, skill.lastSeenAt);
      const bonus = editBonus(skill.editCount);
      const effective = Math.min(100, decayed + bonus);
      return {
        ...skill,
        confidence: effective,
        level: effective >= 60 ? 0 /* Knows */ : 1 /* Learning */
      };
    });
  } catch {
    return [];
  }
}
async function saveSkills(skills) {
  await import_promises3.default.mkdir(path3.dirname(STORE_PATH), { recursive: true });
  let stored = [];
  try {
    const raw = await import_promises3.default.readFile(STORE_PATH, "utf-8");
    stored = JSON.parse(raw).map(migrate);
  } catch {
  }
  for (const skill of skills) {
    const idx = stored.findIndex((s) => s.name === skill.name && s.language === skill.language);
    if (idx === -1) {
      stored.push({ ...skill, editCount: 1 });
    } else {
      const prev = stored[idx];
      const newConfidence = Math.max(prev.confidence, skill.confidence);
      stored[idx] = {
        ...prev,
        confidence: newConfidence,
        usageCount: prev.usageCount + skill.usageCount,
        editCount: prev.editCount + 1,
        // each merge = one more save event
        lastSeenAt: skill.lastSeenAt,
        // reset the decay clock
        level: newConfidence >= 60 ? 0 /* Knows */ : 1 /* Learning */
      };
    }
  }
  await import_promises3.default.writeFile(STORE_PATH, JSON.stringify(stored, null, 2));
}

// src/extension.ts
function getStressedSkills() {
  const stressed = /* @__PURE__ */ new Set();
  for (const [, diags] of vscode.languages.getDiagnostics()) {
    for (const d of diags) {
      if (d.severity !== vscode.DiagnosticSeverity.Error) {
        continue;
      }
      const msg = d.message.toLowerCase();
      if (msg.includes("type argument") || msg.includes("type parameter") || msg.includes("generic")) {
        stressed.add("TypeScript Generics");
      }
      if (msg.includes("interface") || msg.includes("property '") || msg.includes("does not exist on type")) {
        stressed.add("TypeScript Interfaces & Types");
      }
      if (msg.includes("promise") || msg.includes("async") || msg.includes("await")) {
        stressed.add("Async / Await");
      }
      if (msg.includes("hook") || msg.includes("usestate") || msg.includes("useeffect")) {
        stressed.add("React Hooks");
      }
    }
  }
  return stressed;
}
async function runScan(projectPath, singleFile) {
  const detected = await detect(projectPath, singleFile);
  await saveSkills(detected);
  const allSkills = await LoadSkills();
  const stressed = getStressedSkills();
  const content = generate(allSkills, stressed);
  await write(projectPath, content);
}
function activate(context) {
  console.log("fence is active");
  const initCommand = vscode.commands.registerCommand("fence.init", async () => {
    const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!projectPath) {
      return;
    }
    await runScan(projectPath);
  });
  const saveListener = vscode.workspace.onDidSaveTextDocument(async (doc) => {
    const projectPath = vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath;
    if (!projectPath) {
      return;
    }
    await runScan(projectPath, doc.uri.fsPath);
  });
  context.subscriptions.push(initCommand, saveListener);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
