//setup @jscutlery/semver and commit as Conventional Commits before using this script
import {execSync} from 'node:child_process';
import dotenv from "dotenv";

dotenv.config()

let a = execSync('yarn nx print-affected --target=version --trackDeps --base=main~1').toString();
// console.log('exec',a.split('Done in').length)
let obj = `${a.split('Done in')[0]}`
let obj2 = obj.substring(obj.indexOf('{'))
// console.log('object',obj.substring(obj.indexOf('{')))
const res = JSON.parse(obj2);
console.log('exec res',res)
// execSync(`${t.command}`)
// execSync('bash test.sh')
//@ts-ignore
res.tasks.forEach(t => {
    console.log(t.command)
    execSync(`${t.command}`)
  // invokeOnRemote(t.command);
});


// "publish": {
//   "executor": "@nrwl/workspace:run-commands",
//   "options": {
//     "command": "node tools/scripts/publish.mjs ddd {args.ver} {args.tag}"
//   },
//   "dependsOn": [
//     {
//       "projects": "self",
//       "target": "build"
//     }
//   ]
// },