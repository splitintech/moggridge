import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
const root=resolve(import.meta.dirname,'..');
export function sourceDigest(){const files=[];function visit(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())visit(path);else files.push(path);}}visit(join(root,'src'));
 for(const name of ['package.json','package-lock.json','tsup.config.ts','tsconfig.build.json','scripts/finalize-declarations.mjs'])files.push(join(root,name));
 const hash=createHash('sha256');for(const file of files.sort()){hash.update(relative(root,file));hash.update('\0');hash.update(readFileSync(file));hash.update('\0');}return hash.digest('hex');}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename))console.log(sourceDigest());
