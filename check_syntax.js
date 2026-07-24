const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/outlets/Outlet.ts');
const content = fs.readFileSync(filePath, 'utf-8');

const result = ts.transpileModule(content, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    noEmit: true,
    strict: true
  }
});

if (result.diagnostics && result.diagnostics.length > 0) {
  console.log('TypeScript errors:');
  result.diagnostics.forEach(d => console.log(d.messageText));
} else {
  console.log('No TypeScript errors found');
}
