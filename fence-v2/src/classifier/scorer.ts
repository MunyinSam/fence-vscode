import { SignalCounts, Scores } from '../types/index';

function getLevel(score: number): Scores['level'] {
    if (score <= 2) {return 'beginner';};
    if (score <= 4) {return 'elementary'};
    if (score <= 6) {return 'intermediate'};
    if (score <= 8) {return 'advanced'};
    return 'expert';
}

// NO AI SLOP I WROTE THIS MYSELF
export function score(s: SignalCounts): Scores {

    // idiom calculations

    // arrayMethods: number;        // .map, .filter, .reduce -- good
    // optionalChaining: number;   // a?.b?.c -- good
    // nullishCoalescing: number;  // a ?? b -- good
    // destructuring: number;      // const { x } = obj -- good
    // forLoopsOnArrays: number;   // for (let i...) on array -- bad

    const idiomNumerator = s.arrayMethods + s.optionalChaining + s.nullishCoalescing + s.destructuring;
    const idiomTotal = s.arrayMethods + s.optionalChaining + s.nullishCoalescing + s.destructuring + s.forLoopsOnArrays;
    const idiomScore = idiomTotal === 0 
                        ? 0.5 : idiomNumerator / idiomTotal;

    // complexity

    // functions: number;          // total func count
    // totalComplexity: number;    // sum of cyclomatic complexity across all func
    //                             // (the amount of branch in a func)

    const avgComplexity = s.functions === 0 ? 5.5 : s.totalComplexity / s.functions;
    const complexityScore = Math.min(1, (10 - avgComplexity) / 9);

    // abstraction

    // generics: number;           // <T> usage
    // higherOrderFns: number;     // funcs that take/return functions
    // typeDefinitions: number;    // interface, type alias definitions

    // totalLines / 10 , abstraction signals = score of 1.
    // 1 abstraction per 10 lines is alot already

    const abstractionScore = s.totalLines === 0 
                                ? 0.5 : Math.min(1, (s.generics + s.higherOrderFns + s.typeDefinitions) * 10 / s.totalLines);

    // error handling

    // asyncFunctions: number;     // total async functions
    // handledAsync: number;       // async funcs with try/catch or .catch()
    // emptyCatch: number;         // catch blocks that do nothing -- bad
    
    const errorHandlingScore = s.asyncFunctions === 0 
                                ? 0.5 : Math.max(0, (s.handledAsync - s.emptyCatch ) / s.asyncFunctions)

    // modern syntax

    // asyncAwait: number;         // async await count -- good
    // varDeclarations: number;    // var usage -- bad
    // callbackNesting: number;    // nested callbacks -- bad

    const modernTotal = s.asyncAwait + s.callbackNesting;
    const modernScoreBaseRatio = modernTotal === 0 ? 0.5 : (s.asyncAwait) / (modernTotal);
    const normalizedVarDeclarations = s.totalLines === 0 ? 0 : s.varDeclarations / s.totalLines;
    const modernSyntaxScore = Math.max(0, modernScoreBaseRatio - normalizedVarDeclarations);

    // RANGE 0 - 1
    const totalScore = (idiomScore * 0.3) + (complexityScore * 0.2) + (abstractionScore * 0.2) + (errorHandlingScore * 0.15) + (modernSyntaxScore * 0.15)
    const calculatedScore = Math.max(1, totalScore * 10); // at least 1 score
    const level = getLevel(calculatedScore);

    return {
        idiomScore: idiomScore,
        complexityScore: complexityScore,
        abstractionScore: abstractionScore,
        errorHandlingScore: errorHandlingScore,
        modernSyntaxScore: modernSyntaxScore,
        finalScore: calculatedScore,
        level: level
    };
}