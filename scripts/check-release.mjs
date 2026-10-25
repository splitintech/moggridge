import {sourceDigest} from './source-digest.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(readFileSync(new URL('../package.json',import.meta.url)));
const qualification=JSON.parse(readFileSync(process.env.MOTION_QUALIFICATION_FILE || new URL('../docs/qualification.json',import.meta.url)));
const beta=manifest.version.includes('-');
assert.equal(qualification.sourceDigest,sourceDigest(),'Qualification evidence is missing or belongs to different source');
const required=beta?['core','compatibility','package','web','nativeAutomated']:['core','compatibility','package','web','nativeAutomated','splitinRollout','physicalIOS','physicalAndroid','installedPWA'];
for(const key of required){const evidence=qualification.gates[key];assert.equal(evidence?.status,'passed',`${key} has not passed; release is blocked`);assert.ok(evidence.artifacts?.length,`${key} needs reproducible evidence`);}
if(!beta){const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(qualification.buildSHA,sha,'Stable qualification must match this commit');for(const key of ['physicalIOS','physicalAndroid']){const device=qualification.gates[key];for(const field of ['model','os','refreshRate','releaseBuild','repetitions','frameDeadlinePercent','cycles'])assert.ok(device[field],`${key}.${field} is required`);assert.ok(device.repetitions>=5&&device.cycles>=100&&device.frameDeadlinePercent>=99,`${key}: performance acceptance failed`);}}
console.log(`Release qualification passed for ${manifest.version} (${beta?'beta':'stable'})`);
