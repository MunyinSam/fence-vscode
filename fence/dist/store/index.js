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
exports.LoadSkills = LoadSkills;
exports.saveSkills = saveSkills;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const path = __importStar(require("path"));
async function LoadSkills() {
    try {
        const storePath = path.join(node_os_1.default.homedir(), '.fence', 'skills.json');
        const skillsFile = await promises_1.default.readFile(storePath, 'utf-8');
        return JSON.parse(skillsFile);
    }
    catch (error) {
        return [];
    }
}
async function saveSkills(skills) {
    await promises_1.default.mkdir(path.join(node_os_1.default.homedir(), '.fence'), { recursive: true });
    const storePath = path.join(node_os_1.default.homedir(), '.fence', 'skills.json');
    try {
        const storedSkills = await LoadSkills();
        for (let skill of skills) {
            let index = storedSkills.findIndex(s => s.name === skill.name);
            if (index === -1) {
                storedSkills.push(skill);
            }
            else if (skill.level === 0) {
                storedSkills[index].level = 0;
            }
        }
        console.log(storedSkills);
        promises_1.default.writeFile(storePath, JSON.stringify(storedSkills));
    }
    catch (error) {
        return;
    }
    return;
}
// const skills = [
//     { "name": "Async/Await", "desc": "async ", "level": 3 },
//     { "name": "Arrow Functions", "desc": "=>", "level": 0 },
//     { "name": "TypeScript Types", "desc": "interface ", "level": 0 },
//     { "name": "Destructuring", "desc": "const {", "level": 1 },
//     { "name": "Express Routes", "desc": "app.get(", "level": 1 }
// ];
// LoadSkills();
// saveSkills(skills);
// LoadSkills();
//# sourceMappingURL=index.js.map