const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const state = require('../learning-state.js');
const root = require('node:path').resolve(__dirname, '..');
process.chdir(root);
for (const file of fs.readdirSync('.').filter(name => name.endsWith('.js'))) execFileSync(process.execPath, ['--check', file]);
const context = vm.createContext({});
for (const file of ['knowledge-data.js','chapters-data.js','projects-data.js','labs-data.js','deep-dives-data.js','source-reading-data.js','source-traces-data.js','source-refs-data.js','quiz-data.js','modern-data.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
vm.runInContext(`
  if (new Set(COURSE_CHAPTERS.map(item=>item.id)).size !== COURSE_CHAPTERS.length) throw Error('Duplicate chapters');
  for (const chapter of COURSE_CHAPTERS) {
    for (const id of chapter.topicIds) if (!TOPIC_BY_ID[id]) throw Error('Unknown topic: '+id);
    for (const quiz of QUIZZES_BY_CHAPTER[chapter.id] || []) if (!quiz.options[quiz.answer]) throw Error('Invalid quiz answer');
  }
  for (const stage of LEARNING_STAGES) for(const id of stage.ids) if(!CHAPTER_BY_ID[id]) throw Error('Unknown stage chapter');
  for (const ids of Object.values(CHAPTER_LABS)) for(const id of ids) if(!LAB_BY_ID[id]) throw Error('Unknown lab');
  for (const reading of Object.values(PROJECT_SOURCE_READINGS)) for(const file of reading.files) {
    const sha = file[2].match(/(?:blob|tree)\\/([a-f0-9]+)\\//);
    if(sha && sha[1].length !== 40) throw Error('Invalid source SHA: '+file[2]);
  }
`,context);
const memory = new Map([['old-progress', '{"system-boundary":true}'],['bad','{']]);
const storage = {getItem:key=>memory.get(key)};
assert.equal(state.read(storage,'old-progress')['system-boundary'],true);
assert.deepEqual(state.read(storage,'bad'),{});
assert.deepEqual(state.read({getItem(){throw Error('denied');}},'x'),{});
assert.throws(()=>state.validateBackup({version:2},[],[]));
const cleaned=state.validateBackup({version:1,chapters:{a:true,unknown:true},labs:{b:true},quizzes:{a:{0:1,x:'bad'}},notes:{a:'<script>text only</script>'},bookmarks:{'chapter/a':true,'javascript:alert(1)':true}},['a'],['b']);
assert.deepEqual(cleaned.chapters,{a:true});
assert.deepEqual(cleaned.quizzes,{a:{0:1}});
assert.deepEqual(cleaned.bookmarks,{'chapter/a':true});
const question={q:'q',options:['wrong','right'],answer:1};
assert.equal(state.quizStats({a:[question]},{a:{0:0}}).mistakes.length,1);
assert.equal(state.quizStats({a:[question]},{a:{0:1}}).mistakes.length,0);
assert.equal(state.quizStats({a:[question]},{a:{0:99}}).answered,0);
const html=fs.readFileSync('index.html','utf8');
for(const match of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)) {
  const path=match[1].split('?')[0];
  if(!/^https?:/.test(path))assert.ok(fs.existsSync(path),'Missing asset: '+path);
}
assert.equal(fs.readFileSync('CNAME','utf8').trim(),'ai.yusenleo.top');
console.log('Content references, script syntax, backup validation, quiz state and static assets passed.');
