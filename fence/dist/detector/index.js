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
async function detect(projectPath) {
    let files = await promises_1.default.readdir(projectPath, { recursive: true });
    const pattern = /\.ts$|\.js$|\.py$|\.tsx$|\.jsx$/;
    const codeFiles = files.filter(f => pattern.test(f));
    const withStats = await Promise.all(codeFiles.map(async (f) => ({
        file: f,
        stat: await promises_1.default.stat(path.join(projectPath, f))
    })));
    const onlyFiles = withStats.filter(f => f.stat.isFile());
    const filesContent = await Promise.all(onlyFiles.map(async (f) => ({
        file: f.file,
        text: await promises_1.default.readFile(path.join(projectPath, f.file), 'utf-8')
    })));
    const rules = [
        { name: "React Hooks", pattern: "useState", fileTypes: [".tsx", ".jsx"] },
        { name: "Async/Await", pattern: "async ", fileTypes: [".ts", ".js", ".tsx", ".jsx"] },
        { name: "TypeScript Types", pattern: "interface ", fileTypes: [".ts", ".tsx"] },
        { name: "Express Routes", pattern: "app.get(", fileTypes: [".ts", ".js"] },
        { name: "Arrow Functions", pattern: "=>", fileTypes: [".ts", ".js", ".tsx", ".jsx"] },
        { name: "Destructuring", pattern: "const {", fileTypes: [".ts", ".js", ".tsx", ".jsx"] },
    ];
    let results = [];
    for (const rule of rules) {
        // console.log(`${key}: ${value.name}`);
        let ruleName = rule.name;
        let rulePattern = rule.pattern;
        let ruleFileTypes = rule.fileTypes;
        let count = 0;
        for (const f of filesContent) {
            const hasFileType = ruleFileTypes.some(ft => f.file.includes(ft));
            if (hasFileType) {
                count += f.text.split(rulePattern).length - 1;
            }
        }
        if (count >= 5) {
            results.push({ name: ruleName, desc: rulePattern, level: types_1.SkillLevel.Knows });
        }
        else if (count > 0) {
            results.push({ name: ruleName, desc: rulePattern, level: types_1.SkillLevel.Learning });
        }
    }
    // console.log(filesContent);
    return results;
}
detect("D:/Code/Personal/fence-vscode/fence/src").then(console.log);
//# sourceMappingURL=index.js.map