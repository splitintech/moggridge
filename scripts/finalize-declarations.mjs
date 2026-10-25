import {readdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../dist');
function visit(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){const file=join(directory,entry.name);if(entry.isDirectory()){visit(file);continue;}if(!file.endsWith('.d.ts'))continue;
 const text=readFileSync(file,'utf8').replace(/(from\s*|import\s*\()(["'])(\.{1,2}\/[^"']+)\2/g,(match,prefix,quote,specifier)=>{if(/\.[cm]?js$/.test(specifier))return match;const target=resolve(dirname(file),specifier);const extension=existsSync(target+'.d.ts')?'.js':existsSync(join(target,'index.d.ts'))?'/index.js':'';return `${prefix}${quote}${specifier}${extension}${quote}`;});
 writeFileSync(file,text);
 writeFileSync(file.replace(/\.d\.ts$/,'.d.cts'),text.replace(/(["'])(\.{1,2}\/[^"']+)\.js\1/g,'$1$2.cjs$1').replace(/\/\/# sourceMappingURL=.*$/gm,''));
}}
visit(root);
