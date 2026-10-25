import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const workspace=mkdtempSync(join(tmpdir(),'motion-web-consumers-'));
const run=(cmd,args,cwd)=>{const result=spawnSync(cmd,args,{cwd,encoding:'utf8',env:{...process.env,npm_config_cache:join(workspace,'cache')}});assert.equal(result.status,0,result.stderr||result.stdout);return result.stdout;};
try {
 const [pack]=JSON.parse(run('npm',['pack','--json','--ignore-scripts','--pack-destination',workspace],root));
 for(const version of ['18.3.1','19.3.0']){
  const cwd=join(workspace,version);mkdirSync(cwd);
  writeFileSync(join(cwd,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{'@splitin/react-mobile-interactions':`file:${join(workspace,pack.filename)}`,react:version,'react-dom':version,'framer-motion':'^12.43.0','@radix-ui/react-dialog':'^1.1.15','@radix-ui/react-popover':'^1.1.15','react-router-dom':'^6.30.1'},devDependencies:{vite:'^6.1.0',typescript:'^5.8.3','@types/react':version.startsWith('18')?'^18.3.0':'^19.0.0','@types/react-dom':version.startsWith('18')?'^18.3.0':'^19.0.0'}}));
  run('npm',['install','--legacy-peer-deps','--ignore-scripts','--no-audit','--no-fund'],cwd);
  const lock=JSON.parse(readFileSync(join(cwd,'package-lock.json')));
  assert.ok(!Object.keys(lock.packages).some(name=>/node_modules\/(?:react-native|expo)(?:\/|$)/.test(name)),'web consumer installed native engines');
  writeFileSync(join(cwd,'ssr.mjs'),`import React from 'react';import {renderToString} from 'react-dom/server';import {shouldAnimate} from '@splitin/react-mobile-interactions';import {MotionProvider,PressableSurface,TransitionHost} from '@splitin/react-mobile-interactions/web';import {snapTarget} from '@splitin/react-mobile-interactions/core';if(typeof shouldAnimate!=='function'||snapTarget(49,0,[0,100])!==0)throw Error('root/core compatibility');const html=renderToString(React.createElement(MotionProvider,null,React.createElement(TransitionHost,null,React.createElement(PressableSurface,null,'Continue'))));if(!html.includes('Continue'))throw Error('SSR failed');console.log('SSR passed');`);
  run(process.execPath,['ssr.mjs'],cwd);
  writeFileSync(join(cwd,'shared-context.cjs'),readFileSync(new URL('../tests/consumers/shared-context.cjs',import.meta.url)));
  for(const format of ['esm','cjs'])run(process.execPath,['shared-context.cjs',format],cwd);
  writeFileSync(join(cwd,'index.html'),'<div id="root"></div><script type="module" src="/main.tsx"></script>');
  writeFileSync(join(cwd,'main.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import {MotionProvider,PressableSurface,SurfaceSlideTrack,useSurfaceImageScale} from '@splitin/react-mobile-interactions/web';import {cardMotionPresets} from '@splitin/react-mobile-interactions/presets';createRoot(document.getElementById('root')!).render(<MotionProvider><SurfaceSlideTrack index={1} slideCount={3} spring={cardMotionPresets.slide}><PressableSurface>Continue</PressableSurface></SurfaceSlideTrack></MotionProvider>);`);
  writeFileSync(join(cwd,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'Bundler',jsx:'react-jsx',strict:true,skipLibCheck:true,noEmit:true},include:['main.tsx']}));
  run(process.execPath,['node_modules/typescript/bin/tsc'],cwd);
  run(process.execPath,['node_modules/vite/bin/vite.js','build'],cwd);
  console.log(`React ${version}: packed web/root/core imports, cross-entrypoint ESM/CJS contexts, SSR, TypeScript, Vite and no native engines passed`);
 }
} finally {rmSync(workspace,{recursive:true,force:true});}
