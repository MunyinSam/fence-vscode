import { SignalCounts } from '../types/index';
import { readFile } from 'fs/promises';
import { parse, simpleTraverse } from '@typescript-eslint/typescript-estree';

// Promise<SignalCounts>
export async function scanner(dir: string): Promise<any> {
    const fileContents = await readFile(dir, 'utf-8');

    const ast = parse(fileContents, { jsx: true });

    let counts = {
        totalLines: fileContents.split('\n').length,

        // idiom - Do you write JS as the way it is intended
        arrayMethods: 0,        // .map, .filter, .reduce -- good
        optionalChaining: 0,   // a?.b?.c -- good
        nullishCoalescing: 0,  // a ?? b -- good
        destructuring: 0,      // const { x } = obj -- good
        forLoopsOnArrays: 0,   // for (let i...) on array -- bad

        // complexity - Do you keep ur code simple
        functions: 0,          // total func count
        totalComplexity: 0,    // sum of cyclomatic complexity across all func
                                    // (the amount of branch in a func)
        
        // abstraction
        generics: 0,           // <T> usage
        higherOrderFns: 0,     // funcs that take/return functions
        typeDefinitions: 0,    // interface, type alias definitions

        // error handling
        asyncFunctions: 0,     // total async functions
        handledAsync: 0,       // async funcs with try/catch or .catch()
        emptyCatch: 0,         // catch blocks that do nothing -- bad

        // modern syntax
        asyncAwait: 0,         // async await count -- good
        varDeclarations: 0,    // var usage -- bad
        callbackNesting: 0,    // nested callbacks -- bad
    };

}

scanner('D:/Code/Personal/fence-vscode/fence-v2/src/classifier/scorer.ts')