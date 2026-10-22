// Optional online check; use the logged-in GitHub CLI without reading or printing credentials.
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
process.chdir(require('node:path').resolve(__dirname, '..'));
const context = vm.createContext({});
for(const file of ['knowledge-data.js','chapters-data.js','projects-data.js','labs-data.js','deep-dives-data.js','source-reading-data.js','source-traces-data.js','source-refs-data.js','quiz-data.js','modern-data.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
const readings = vm.runInContext('PROJECT_SOURCE_READINGS',context);
let failed = 0;
for(const [id,reading] of Object.entries(readings)) {
  const url=reading.files[0]?.[2].match(/^https:\/\/github.com\/([^/]+\/[^/]+)\/(?:blob|tree)\/([^/]+)/);
  if(!url)continue;
  try {
    const result=JSON.parse(execFileSync('gh',['api',`repos/${url[1]}/git/trees/${url[2]}?recursive=1`],{encoding:'utf8',maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']}));
    if(result.truncated)throw Error('Tree response is truncated; completeness is not verified');
    const paths=new Set(result.tree.map(item=>item.path));
    for(const file of reading.files)if(!paths.has(file[1]))throw Error('Missing path: '+file[1]);
    console.log(id+': snapshot and paths exist');
  }catch(error){failed++;console.error(id+': '+(error.stderr?.toString().trim()||error.message));}
}
process.exitCode=failed?1:0;
