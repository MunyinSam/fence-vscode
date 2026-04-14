export interface SignalCounts {

    totalLines: number;

    // idiom - Do you write JS as the way it is intended
    arrayMethods: number;        // .map, .filter, .reduce -- good
    optionalChaining: number;   // a?.b?.c -- good
    nullishCoalescing: number;  // a ?? b -- good
    destructuring: number;      // const { x } = obj -- good
    forLoopsOnArrays: number;   // for (let i...) on array -- bad

    // complexity - Do you keep ur code simple
    functions: number;          // total func count
    totalComplexity: number;    // sum of cyclomatic complexity across all func
                                // (the amount of branch in a func)
    
    // abstraction
    generics: number;           // <T> usage
    higherOrderFns: number;     // funcs that take/return functions
    typeDefinitions: number;    // interface, type alias definitions

    // error handling
    asyncFunctions: number;     // total async functions
    handledAsync: number;       // async funcs with try/catch or .catch()
    emptyCatch: number;         // catch blocks that do nothing -- bad

    // modern syntax
    asyncAwait: number;         // async await count -- good
    varDeclarations: number;    // var usage -- bad
    callbackNesting: number;    // nested callbacks -- bad

}

export interface Scores {
    idiomScore: number;
    complexityScore: number;
    abstractionScore: number;
    errorHandlingScore: number;
    modernSyntaxScore: number;
    finalScore: number;      // 1–10
    level: 'beginner' | 'elementary' | 'intermediate' | 'advanced' | 'expert';
}