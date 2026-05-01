import { SignalCounts } from '../types/index';
import { readFile } from 'fs/promises';
import { parse, simpleTraverse } from '@typescript-eslint/typescript-estree';

// Promise<SignalCounts>
export async function scanner(dir: string): Promise<SignalCounts> {
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

    simpleTraverse(ast, {
        enter(node) {
            
            if (node.type === 'ChainExpression') {
                counts.optionalChaining++;
            }
            if (node.type === 'LogicalExpression' && node.operator === '??') {
                counts.nullishCoalescing++;
            }
            if (node.type === 'VariableDeclaration' && node.kind === 'var') {
                counts.varDeclarations++;
            }
            if (node.type === 'AwaitExpression') {
                counts.asyncAwait++;
            }
            if (node.type === 'ObjectPattern' || node.type === 'ArrayPattern') {
                counts.destructuring++;
            }
            if (node.type === 'ForStatement') {
                counts.forLoopsOnArrays++;
            }
            if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
                counts.functions++;
            }
            if (node.type === 'TSTypeParameterDeclaration') {
                counts.generics++;
            }
            if (node.type === 'TSInterfaceDeclaration' || node.type === 'TSTypeAliasDeclaration') {
                counts.typeDefinitions++;
            }
            // Skip first
            // if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
            //     counts.callbackNesting++;
            // }
            if (node.type === 'CatchClause' && node.body.body.length === 0){
                counts.emptyCatch++;
            }
            if (node.type === 'CallExpression' && 
                node.callee.type === 'MemberExpression' &&
                node.callee.property.type === 'Identifier' &&
                ['map','filter','reduce','find','forEach','some','every'].includes(node.callee.property.name)) {
                counts.arrayMethods++;
            }
            if (node.type === 'IfStatement' || node.type === 'ForStatement' ||
                 node.type === 'WhileStatement' || node.type === 'ConditionalExpression' ||
                node.type === 'SwitchCase' || (node.type === 'LogicalExpression' && (node.operator === '&&' || node.operator === '||'))) {
                counts.totalComplexity++;                    
            }
            if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') && node.async === true) {
                counts.asyncFunctions++;
                if (node.body.type === 'BlockStatement' && node.body.body.some(statement => statement.type === 'TryStatement')) {
                    counts.handledAsync++;
                }
            }

    }});
    console.log(counts);
    return counts;
}

scanner('D:/Code/Personal/fence-vscode/fence-v2/src/test/demo.ts')
scanner('D:/Code/Personal/fence-vscode/fence-v2/src/classifier/ast.ts')