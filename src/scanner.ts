import { Project, SourceFile, SyntaxKind, Node, ts } from 'ts-morph';
import type { SignalCounts } from './types/index';

const ARRAY_METHODS = new Set([
  'map', 'filter', 'reduce', 'forEach', 'find',
  'findIndex', 'some', 'every', 'flat', 'flatMap',
]);

const UTILITY_TYPES = new Set([
  'Partial', 'Required', 'Pick', 'Omit', 'Record',
  'ReturnType', 'Parameters', 'NonNullable', 'Readonly',
  'Extract', 'Exclude', 'InstanceType', 'Awaited',
]);

// ── Entry point ────────────────────────────────────────────────────────────

export function scanFile(filePath: string): SignalCounts {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { skipLibCheck: true, allowJs: true },
  });

  let sf: SourceFile;
  try {
    sf = project.addSourceFileAtPath(filePath);
  } catch {
    return emptySignalCounts(filePath);
  }

  return {
    filePath,
    scannedAt: new Date().toISOString(),
    author: '', // filled by the git blame layer
    totalLines: sf.getEndLineNumber(),
    idioms: countIdioms(sf),
    complexity: countComplexity(sf),
    abstraction: countAbstraction(sf),
    errorHandling: countErrorHandling(sf),
    modernSyntax: countModernSyntax(sf),
    antiPatterns: countAntiPatterns(sf),
    tierConstructs: detectTierConstructs(sf),
  };
}

// ── Shared helpers ─────────────────────────────────────────────────────────

// All function-like nodes share: getTypeParameters(), getParameters(),
// getReturnTypeNode(), isAsync(), getDescendantsOfKind()
function getFunctionLike(sf: SourceFile) {
  return [
    ...sf.getDescendantsOfKind(SyntaxKind.FunctionDeclaration),
    ...sf.getDescendantsOfKind(SyntaxKind.FunctionExpression),
    ...sf.getDescendantsOfKind(SyntaxKind.ArrowFunction),
    ...sf.getDescendantsOfKind(SyntaxKind.MethodDeclaration),
  ];
}

// ts-morph doesn't expose comments as queryable descendants — read raw text
function extractComments(sf: SourceFile): string[] {
  const text = sf.getFullText();
  const comments: string[] = [];
  const singleLine = /\/\/[^\n]*/g;
  const multiLine = /\/\*[\s\S]*?\*\//g;
  let m: RegExpExecArray | null;
  while ((m = singleLine.exec(text)) !== null) comments.push(m[0]);
  while ((m = multiLine.exec(text)) !== null) comments.push(m[0]);
  return comments;
}

// ── Signal counters ────────────────────────────────────────────────────────

function countIdioms(sf: SourceFile): SignalCounts['idioms'] {
  let arrayMethods = 0;
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = call.getExpression();
    if (Node.isPropertyAccessExpression(expr) && ARRAY_METHODS.has(expr.getName())) {
      arrayMethods++;
    }
  }

  // QuestionDotToken is the `?.` punctuation node — one per optional chain link
  const optionalChaining = sf.getDescendantsOfKind(SyntaxKind.QuestionDotToken).length;

  const nullishCoalescing = sf.getDescendantsOfKind(SyntaxKind.BinaryExpression)
    .filter(n => n.getOperatorToken().getKind() === SyntaxKind.QuestionQuestionToken)
    .length;

  const destructuring =
    sf.getDescendantsOfKind(SyntaxKind.ObjectBindingPattern).length +
    sf.getDescendantsOfKind(SyntaxKind.ArrayBindingPattern).length;

  // Traditional for-loops on arrays (as opposed to .map/.filter)
  const forLoopsOnArrays = sf.getDescendantsOfKind(SyntaxKind.ForStatement).length;

  return { arrayMethods, optionalChaining, nullishCoalescing, destructuring, forLoopsOnArrays };
}

function countComplexity(sf: SourceFile): SignalCounts['complexity'] {
  const fns = getFunctionLike(sf);

  let totalComplexity = 0;
  for (const fn of fns) {
    let cc = 1; // cyclomatic complexity baseline
    cc += fn.getDescendantsOfKind(SyntaxKind.IfStatement).length;
    cc += fn.getDescendantsOfKind(SyntaxKind.WhileStatement).length;
    cc += fn.getDescendantsOfKind(SyntaxKind.ForStatement).length;
    cc += fn.getDescendantsOfKind(SyntaxKind.ForOfStatement).length;
    cc += fn.getDescendantsOfKind(SyntaxKind.ForInStatement).length;
    cc += fn.getDescendantsOfKind(SyntaxKind.CaseClause).length;
    cc += fn.getDescendantsOfKind(SyntaxKind.ConditionalExpression).length; // ternaries
    cc += fn.getDescendantsOfKind(SyntaxKind.BinaryExpression).filter(b => {
      const op = b.getOperatorToken().getKind();
      return op === SyntaxKind.AmpersandAmpersandToken || op === SyntaxKind.BarBarToken;
    }).length;
    totalComplexity += cc;
  }

  return { functions: fns.length, totalComplexity };
}

function countAbstraction(sf: SourceFile): SignalCounts['abstraction'] {
  // consuming: using an existing generic type — Array<string>, Promise<void>, etc.
  const consuming = sf.getDescendantsOfKind(SyntaxKind.TypeReference)
    .filter(n => n.getTypeArguments().length > 0)
    .length;

  const fns = getFunctionLike(sf);
  const fnsWithTypeParams = fns.filter(fn => fn.getTypeParameters().length > 0);

  // writingBasic: function declares its own type params, none have constraints
  const writingBasic = fnsWithTypeParams.filter(fn =>
    fn.getTypeParameters().every(tp => !tp.getConstraint())
  ).length;

  // constrained: any TypeParameter that has an `extends` constraint
  const constrained = sf.getDescendantsOfKind(SyntaxKind.TypeParameter)
    .filter(tp => !!tp.getConstraint())
    .length;

  // conditional: T extends U ? X : Y
  const conditional = sf.getDescendantsOfKind(SyntaxKind.ConditionalType).length;

  // higher-order: function whose parameter type is a function type
  let higherOrderFns = 0;
  for (const fn of fns) {
    const takesCallback = fn.getParameters().some(p =>
      p.getTypeNode()?.getKind() === SyntaxKind.FunctionType
    );
    if (takesCallback) higherOrderFns++;
  }

  const typeDefinitions =
    sf.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration).length +
    sf.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration).length;

  return {
    generics: { consuming, writingBasic, constrained, conditional },
    higherOrderFns,
    typeDefinitions,
  };
}

function countErrorHandling(sf: SourceFile): SignalCounts['errorHandling'] {
  const fns = getFunctionLike(sf);
  const asyncFns = fns.filter(fn => fn.isAsync());

  const handledAsync = asyncFns.filter(fn =>
    fn.getDescendantsOfKind(SyntaxKind.TryStatement).length > 0
  ).length;

  const emptyCatch = sf.getDescendantsOfKind(SyntaxKind.CatchClause)
    .filter(c => c.getBlock().getStatements().length === 0)
    .length;

  // Floating promises: unawaited call expressions used as statements.
  // Requires type resolution — ts-morph can resolve types even without a full tsconfig.
  let floatingPromises = 0;
  for (const stmt of sf.getDescendantsOfKind(SyntaxKind.ExpressionStatement)) {
    const expr = stmt.getExpression();
    if (!Node.isCallExpression(expr)) continue;
    try {
      if (expr.getType().getText().startsWith('Promise<')) floatingPromises++;
    } catch {
      // type resolution failed for this node — skip it
    }
  }

  return { asyncFunctions: asyncFns.length, handledAsync, emptyCatch, floatingPromises };
}

function countModernSyntax(sf: SourceFile): SignalCounts['modernSyntax'] {
  const asyncAwait = sf.getDescendantsOfKind(SyntaxKind.AwaitExpression).length;

  // var declarations: VariableDeclarationList with no Let or Const flag = var
  const varDeclarations = sf.getDescendantsOfKind(SyntaxKind.VariableDeclarationList)
    .filter(vdl => {
      const flags = vdl.compilerNode.flags;
      return (flags & ts.NodeFlags.Let) === 0 && (flags & ts.NodeFlags.Const) === 0;
    })
    .length;

  // Callback nesting: a callback argument that itself contains another callback argument
  let callbackNesting = 0;
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    for (const arg of call.getArguments()) {
      if (!Node.isFunctionExpression(arg) && !Node.isArrowFunction(arg)) continue;
      const hasNestedCallback = arg.getDescendantsOfKind(SyntaxKind.CallExpression)
        .some(inner =>
          inner.getArguments().some(a => Node.isFunctionExpression(a) || Node.isArrowFunction(a))
        );
      if (hasNestedCallback) callbackNesting++;
    }
  }

  return { asyncAwait, varDeclarations, callbackNesting };
}

function countAntiPatterns(sf: SourceFile): SignalCounts['antiPatterns'] {
  const anyUsage = sf.getDescendantsOfKind(SyntaxKind.AnyKeyword).length;

  const anyAsReturnType = getFunctionLike(sf).filter(fn =>
    fn.getReturnTypeNode()?.getKind() === SyntaxKind.AnyKeyword
  ).length;

  const comments = extractComments(sf);
  const tsIgnore = comments.filter(c =>
    c.includes('@ts-ignore') || c.includes('@ts-nocheck')
  ).length;
  const eslintDisable = comments.filter(c => c.includes('eslint-disable')).length;

  // Unsafe assertions: `expr as T` where T is not `const`
  const unsafeAssertion = sf.getDescendantsOfKind(SyntaxKind.AsExpression)
    .filter(n => n.getTypeNode()?.getText() !== 'const')
    .length;

  const emptyCatch = sf.getDescendantsOfKind(SyntaxKind.CatchClause)
    .filter(c => c.getBlock().getStatements().length === 0)
    .length;

  return { anyUsage, anyAsReturnType, tsIgnore, eslintDisable, unsafeAssertion, emptyCatch };
}

function detectTierConstructs(sf: SourceFile): SignalCounts['tierConstructs'] {
  const tier1: string[] = [];
  const tier2: string[] = [];
  const tier3: string[] = [];
  const tier4: string[] = [];
  const tier5: string[] = [];

  // ── Tier 1 ──
  const basicTypeKinds = [
    SyntaxKind.StringKeyword, SyntaxKind.NumberKeyword,
    SyntaxKind.BooleanKeyword, SyntaxKind.VoidKeyword,
  ];
  if (basicTypeKinds.some(k => sf.getDescendantsOfKind(k).length > 0)) {
    tier1.push('basicTypes');
  }
  if (sf.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration).length > 0) {
    tier1.push('simpleInterfaces');
  }
  if (getFunctionLike(sf).some(fn => fn.getParameters().some(p => p.getTypeNode()))) {
    tier1.push('typedFunctions');
  }

  // ── Tier 2 ──
  if (sf.getDescendantsOfKind(SyntaxKind.UnionType).length > 0) {
    tier2.push('unionTypes');
  }
  if (sf.getDescendantsOfKind(SyntaxKind.TypeReference).some(n => n.getTypeArguments().length > 0)) {
    tier2.push('consumingGenerics');
  }
  if (sf.getDescendantsOfKind(SyntaxKind.QuestionDotToken).length > 0) {
    tier2.push('optionalChaining');
  }
  if (sf.getDescendantsOfKind(SyntaxKind.BinaryExpression).some(n =>
    n.getOperatorToken().getKind() === SyntaxKind.QuestionQuestionToken
  )) {
    tier2.push('nullishCoalescing');
  }

  // ── Tier 3 ──
  if (getFunctionLike(sf).some(fn => fn.getTypeParameters().length > 0)) {
    tier3.push('writingGenerics');
  }
  // TypePredicate = `x is SomeType` return annotation
  if (sf.getDescendantsOfKind(SyntaxKind.TypePredicate).length > 0) {
    tier3.push('typeGuards');
  }
  if (sf.getDescendantsOfKind(SyntaxKind.TypeReference).some(n =>
    UTILITY_TYPES.has(n.getTypeName().getText())
  )) {
    tier3.push('utilityTypes');
  }
  // Discriminated union heuristic: switch statement on a property access (e.g. switch(x.kind))
  if (sf.getDescendantsOfKind(SyntaxKind.SwitchStatement).some(sw =>
    Node.isPropertyAccessExpression(sw.getExpression())
  )) {
    tier3.push('discriminatedUnions');
  }
  if (sf.getDescendantsOfKind(SyntaxKind.AwaitExpression).length > 0) {
    tier3.push('asyncAwait');
  }

  // ── Tier 4 ──
  if (sf.getDescendantsOfKind(SyntaxKind.ConditionalType).length > 0) {
    tier4.push('conditionalTypes');
  }
  if (sf.getDescendantsOfKind(SyntaxKind.MappedType).length > 0) {
    tier4.push('mappedTypes');
  }
  if (sf.getDescendantsOfKind(SyntaxKind.InferType).length > 0) {
    tier4.push('inferKeyword');
  }
  if (sf.getDescendantsOfKind(SyntaxKind.TypeParameter).some(tp => !!tp.getConstraint())) {
    tier4.push('constrainedGenerics');
  }
  if (sf.getDescendantsOfKind(SyntaxKind.TemplateLiteralType).length > 0) {
    tier4.push('templateLiteralTypes');
  }

  // ── Tier 5 ──
  // Recursive type: type alias whose body text contains its own name
  if (sf.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration).some(ta =>
    (ta.getTypeNode()?.getText() ?? '').includes(ta.getName())
  )) {
    tier5.push('recursiveTypes');
  }
  // Variance annotations: `in`/`out` modifiers on TypeParameter (TS 4.7+)
  if (sf.getDescendantsOfKind(SyntaxKind.TypeParameter).some(tp =>
    tp.getModifiers().length > 0
  )) {
    tier5.push('varianceAnnotations');
  }

  return { tier1, tier2, tier3, tier4, tier5 };
}

// ── Fallback for unreadable files ──────────────────────────────────────────

function emptySignalCounts(filePath: string): SignalCounts {
  return {
    filePath,
    scannedAt: new Date().toISOString(),
    author: '',
    totalLines: 0,
    idioms: { arrayMethods: 0, optionalChaining: 0, nullishCoalescing: 0, destructuring: 0, forLoopsOnArrays: 0 },
    complexity: { functions: 0, totalComplexity: 0 },
    abstraction: {
      generics: { consuming: 0, writingBasic: 0, constrained: 0, conditional: 0 },
      higherOrderFns: 0,
      typeDefinitions: 0,
    },
    errorHandling: { asyncFunctions: 0, handledAsync: 0, emptyCatch: 0, floatingPromises: 0 },
    modernSyntax: { asyncAwait: 0, varDeclarations: 0, callbackNesting: 0 },
    antiPatterns: { anyUsage: 0, anyAsReturnType: 0, tsIgnore: 0, eslintDisable: 0, unsafeAssertion: 0, emptyCatch: 0 },
    tierConstructs: { tier1: [], tier2: [], tier3: [], tier4: [], tier5: [] },
  };
}
