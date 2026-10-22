const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const cleanTitle = title => title.replace(/^\d+\.\d+\s*/, '');
let storage;
try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw new Error('storage unavailable'); } }; }
const stateKeys = { chapters: 'agent-systems-progress', labs: 'agent-systems-lab-progress', quizzes: 'agent-systems-quiz-progress', notes: 'agent-systems-notes', bookmarks: 'agent-systems-bookmarks', prefs: 'agent-systems-preferences' };
const learning = Object.fromEntries(Object.entries(stateKeys).map(([name, key]) => [name, LearningState.read(storage, key)]));
let searchSelection = 0;
let glossaryQuery = '', glossaryDomain = 'all';
let activeRoute = '';
let mermaidLoading = false;
const navigation = [['home', '学习中心', '⌂'], ['course', '系统课程', '▤'], ['labs', '实战实验', '⌘'], ['projects', '源码研读', '⌥'], ['map', '知识地图', '⊞'], ['glossary', '概念辞典', '≡'], ['frontier', '前沿专题', '◈'], ['progress', '我的学习', '○']];

function announce(message) { $('#live-status').textContent = message; }
function save(name) {
  try { storage.setItem(stateKeys[name], JSON.stringify(learning[name])); return true; }
  catch { announce('浏览器未能保存记录，请到“我的学习”导出备份。'); return false; }
}
function sourceLinks(sources = []) {
  return `<div class="source-links">${sources.filter(source => /^https?:\/\//.test(source.url)).map(source => `<a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.label)} ↗</a>`).join('')}</div>`;
}
function codeBlock(code, label = '参考代码 · 阅读后运行验证') {
  return `<div class="code-shell"><div class="code-label"><span>${esc(label)}</span><button class="copy-code">复制代码</button></div><pre><code>${esc(code)}</code></pre></div>`;
}
function diagram(code) {
  return `<figure class="diagram-shell"><div class="mermaid">${esc(code)}</div><details><summary>查看图的文本描述</summary><pre>${esc(code)}</pre></details></figure>`;
}
function sectionHtml(section) {
  return `<section class="reader-section"><h2>${esc(cleanTitle(section.title))}</h2>${section.paragraphs.map(text => `<p>${esc(text)}</p>`).join('')}${section.callout ? `<aside class="callout">${esc(section.callout)}</aside>` : ''}${section.diagram ? diagram(section.diagram) : ''}${section.code ? codeBlock(section.code) : ''}</section>`;
}
function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map(cell => `<th>${esc(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function list(items, ordered = false) { const tag = ordered ? 'ol' : 'ul'; return `<${tag}>${items.map(item => `<li>${esc(item)}</li>`).join('')}</${tag}>`; }
function bookmark(kind, id) { const key = `${kind}/${id}`; return `<button data-bookmark="${esc(key)}" aria-pressed="${learning.bookmarks[key] === true}">${learning.bookmarks[key] ? '已收藏' : '收藏'}</button>`; }
function topicLinks(ids) { return `<div class="tag-list">${ids.filter(id => TOPIC_BY_ID[id]).map(id => `<a href="#concept/${id}">${esc(TOPIC_BY_ID[id].name)}</a>`).join('')}</div>`; }
function heading(title, description, extra = '') { return `<header class="page-heading"><div><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${extra}</header>`; }
function empty(text) { return `<div class="empty-state">${esc(text)}</div>`; }
function chapterRow(chapter) { return `<a class="chapter-row" href="#chapter/${chapter.id}"><span class="row-number">${chapter.number}</span><span class="row-body"><strong>${esc(chapter.title)}</strong><small>${chapter.sections.length} 个小节 · ${esc(chapter.duration)}</small></span><span class="row-tail ${learning.chapters[chapter.id] ? 'row-done' : ''}">${learning.chapters[chapter.id] ? '已完成' : '开始阅读'}</span></a>`; }
function stagesHtml(stages = LEARNING_STAGES) { return stages.map((stage, index) => `<section class="stage"><header class="stage-head"><span class="stage-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${esc(stage.title)}</h3><p>${esc(stage.description)}</p></div></header>${stage.ids.map(id => chapterRow(CHAPTER_BY_ID[id])).join('')}</section>`).join(''); }
function frontierCards() { return MODERN_CHAPTERS.map(chapter => `<a class="content-card" href="#chapter/${chapter.id}"><span class="badge violet">${esc(chapter.tag)}</span><h3>${esc(chapter.title)}</h3><p>${esc(chapter.thesis)}</p><small>${esc(chapter.duration)} · 已核验 ${CONTENT_REVIEW_DATE}</small></a>`).join(''); }
function renderHome() {
  const next = COURSE_CHAPTERS.find(chapter => !learning.chapters[chapter.id]) || COURSE_CHAPTERS[0];
  const last = learning.prefs.lastChapter && CHAPTER_BY_ID[learning.prefs.lastChapter];
  const resume = last && !learning.chapters[last.id] ? last : next;
  const completed = COURSE_CHAPTERS.filter(chapter => learning.chapters[chapter.id]).length;
  const labs = LABS.filter(lab => learning.labs[lab.id]).length;
  const stats = LearningState.quizStats(QUIZZES_BY_CHAPTER, learning.quizzes);
  $('#content').innerHTML = `<div class="page">${heading('把 AI Agent，学成自己的能力。', '从第一性原理出发，在代码、实验与真实架构之间建立联系。按自己的节奏，完成每一个学习闭环。')}<div class="dashboard-grid"><div><section class="continue-card"><span class="badge violet">${last ? '继续上次的学习' : '你的第一站'}</span><h2>${esc(resume.title)}</h2><p>${esc(resume.thesis)}</p><div class="inline-actions"><a class="button" href="#chapter/${resume.id}${last?.id === resume.id && learning.prefs.lastUnit ? '/' + esc(learning.prefs.lastUnit) : ''}">${last ? '继续学习' : '开始第一课'} <span aria-hidden="true">→</span></a><a class="text-link" href="#course">查看完整课程</a></div></section><div class="section-heading"><h2>一条循序渐进的学习路径</h2><a class="text-link" href="#map">查看知识地图</a></div>${stagesHtml(LEARNING_STAGES.slice(0,3))}<div class="section-heading"><h2>值得深入的前沿专题</h2><a class="text-link" href="#frontier">查看全部</a></div><div class="frontier-grid">${frontierCards()}</div></div><aside class="dashboard-aside"><section class="panel"><h2>你的学习进度</h2><div class="progress-summary"><b>${completed} / ${COURSE_CHAPTERS.length} 章</b><span>${Math.round(completed / COURSE_CHAPTERS.length * 100)}%</span></div><div class="progress-track" role="progressbar" aria-label="课程完成进度" aria-valuenow="${completed}" aria-valuemin="0" aria-valuemax="${COURSE_CHAPTERS.length}"><span style="width:${completed / COURSE_CHAPTERS.length * 100}%"></span></div><ul class="fact-list"><li>实战实验<b>${labs} / ${LABS.length}</b></li><li>自测答对<b>${stats.correct} / ${stats.answered}</b></li><li>待复习错题<b>${stats.mistakes.length}</b></li></ul><a class="text-link" href="#progress">打开学习记录</a></section><section class="panel reading-tip"><h2>不止是读懂。</h2><p>先解释原理，再运行最小代码。主动制造一次失败，最后用测试和证据说明你修复了什么。</p><a class="text-link" href="#labs">打开实战实验</a></section><section class="panel"><h2>本次内容更新</h2><a class="update-item" href="#chapter/mcp-evolution">MCP 2026 协议迁移<small>版本、发现、请求元数据与兼容性</small></a><a class="update-item" href="#chapter/harness-engineering">长任务 Harness 与 Deep Agents<small>环境、任务清单与跨会话恢复</small></a><a class="update-item" href="#chapter/multimodal-evals">多模态系统与 Agent 评测<small>从最终回答走向过程与环境验收</small></a><small class="quiet-label">一手资料核验：${CONTENT_REVIEW_DATE}</small></section></aside></div></div>`;
}
function renderCourse() { $('#content').innerHTML = `<div class="page">${heading('系统课程', '先学会解释系统，再学会构建系统。章节按前置依赖组织；每章包含正文、实现、实验与自测。')}<div class="dashboard-grid"><div>${stagesHtml()}</div><aside class="panel"><h2>如何使用这套课程</h2><p>没有 Agent 经验，从第一阶段开始。有后端经验，可以优先阅读 Runtime、Graph 和生产化，再补模型与检索基础。</p><p>章节显示的是含实验的建议投入时间；正文按小节阅读，可随时离开并继续。</p><a class="text-link" href="#progress">管理进度与笔记</a></aside></div></div>`; }

function chapterUnits(chapter) {
  return [{ id: 'overview', title: '本章导读' }, ...chapter.sections.map((section, index) => ({ id: String(index), title: cleanTitle(section.title) })), ...(DEEP_DIVE_BY_CHAPTER[chapter.id] ? [{ id: 'implementation', title: '实现深读与故障演练' }] : []), { id: 'practice', title: '动手实验与验收' }, { id: 'quiz', title: '自测与复盘' }];
}
function deepDiveHtml(dive) {
  return `<section class="reader-section"><h2>${esc(dive.title)}</h2><p>${esc(dive.premise)}</p><h3>从约束推导实现</h3>${dive.derivation.map(item => `<p>${esc(item)}</p>`).join('')}${diagram(dive.model)}<h3>最小参考实现</h3>${codeBlock(dive.code)}<h3>一次执行轨迹</h3>${list(dive.trace,true)}<h3>故障与修复</h3>${table(['故障','原因','修复'],dive.failures)}<h3>掌握检查</h3>${list(dive.drills,true)}<aside class="callout">${esc(dive.answer)}</aside><h3>映射到开源实现</h3>${table(['项目','路径或符号','阅读重点'],dive.sourceMap)}</section>`;
}
function quizQuestion(chapterId, question, index) {
  const selected = learning.quizzes[chapterId]?.[index];
  return `<fieldset class="quiz-question" id="quiz-${chapterId}-${index}"><legend>${index + 1}. ${esc(question.q)}</legend><div class="quiz-options">${question.options.map((option, answer) => `<button class="quiz-option ${selected === answer ? (answer === question.answer ? 'correct' : 'wrong') : ''}" data-answer="${answer}" data-question="${index}" data-quiz-chapter="${chapterId}" aria-pressed="${selected === answer}">${esc(option)}</button>`).join('')}</div><div class="quiz-feedback" ${selected === undefined ? 'hidden' : ''} role="status">${selected === undefined ? '' : `<p>${selected === question.answer ? '回答正确。' : '需要再想一想。'}${esc(question.why)}</p>`}</div></fieldset>`;
}
function renderChapter(id, unit = 'overview') {
  const chapter = CHAPTER_BY_ID[id];
  if (!chapter) return renderNotFound();
  const units = chapterUnits(chapter);
  let selected = units.find(item => item.id === unit) || units[0];
  const position = units.indexOf(selected);
  learning.prefs.lastChapter = id; learning.prefs.lastUnit = selected.id; save('prefs');
  let body = '';
  if (selected.id === 'overview') body = `<section class="objectives"><h2>完成本章后，你应该能够</h2>${list(chapter.objectives)}</section>${diagram(chapter.diagram)}<section class="reader-section"><h2>本章学习顺序</h2>${units.slice(1).map((item,index) => `<a class="chapter-row" href="#chapter/${id}/${item.id}"><span class="row-number">${String(index+1).padStart(2,'0')}</span><span class="row-body"><strong>${esc(item.title)}</strong></span><span aria-hidden="true">→</span></a>`).join('')}</section>${chapter.sources ? sourceLinks(chapter.sources) : ''}`;
  else if (selected.id === 'implementation') body = deepDiveHtml(DEEP_DIVE_BY_CHAPTER[id]);
  else if (selected.id === 'practice') body = `<section class="reader-section"><h2>${esc(chapter.lab.title)}</h2><h3>动手步骤</h3>${list(chapter.lab.steps,true)}<h3>验收标准</h3>${list(chapter.lab.acceptance)}<h3>配套实验</h3>${(CHAPTER_LABS[id] || []).map(labId => LAB_BY_ID[labId]).filter(Boolean).map(lab => `<a class="chapter-row" href="#lab/${lab.id}"><span class="badge">${lab.number}</span><span class="row-body"><strong>${esc(lab.title)}</strong><small>${esc((LAB_STATUS[lab.id] || ['无密钥教学实验'])[0])}</small></span></a>`).join('') || '<p>本章实验使用上方设计任务完成，记录你的输入、结果与失败分析。</p>'}</section>`;
  else if (selected.id === 'quiz') body = `<section class="reader-section"><h2>用问题检验理解</h2><p>选择后查看解析；做错的题会进入“我的学习”，修正答案后自动移出待复习列表。</p>${(QUIZZES_BY_CHAPTER[id] || []).map((question,index) => quizQuestion(id,question,index)).join('')}</section><div class="note-field"><label for="chapter-note">给未来的自己留一条笔记</label><textarea id="chapter-note" maxlength="20000" placeholder="我理解的原理、实验结果、还没想清的问题…">${esc(learning.notes[id] || '')}</textarea><span class="note-status" id="note-status">保存在当前浏览器，可在“我的学习”导出。</span></div><button class="button" data-complete-chapter="${id}" aria-pressed="${!!learning.chapters[id]}">${learning.chapters[id] ? '已完成本章 · 撤销' : '标记本章完成'}</button>`;
  else body = sectionHtml(chapter.sections[Number(selected.id)]);
  const nextChapter = COURSE_CHAPTERS[COURSE_CHAPTERS.indexOf(chapter) + 1];
  $('#content').innerHTML = `<div class="reader-layout"><aside class="reader-index"><details class="lesson-disclosure"><summary>本章目录 · 第 ${chapter.number} 章</summary><nav aria-label="本章小节"><a href="#course">← 返回全部课程</a>${units.map(item => `<a href="#chapter/${id}/${item.id}" class="${item.id === selected.id ? 'active' : ''}" ${item.id === selected.id ? 'aria-current="page"' : ''}>${esc(item.title)}</a>`).join('')}<p class="group-label">相关知识</p>${chapter.topicIds.filter(topicId => TOPIC_BY_ID[topicId]).map(topicId => `<a href="#concept/${topicId}">${esc(TOPIC_BY_ID[topicId].name)}</a>`).join('')}</nav></details></aside><article class="reader-main"><div class="reader-body"><div class="reader-tools"><span>系统课程 / 第 ${chapter.number} 章 / ${position+1} of ${units.length}</span><div>${bookmark('chapter',id)} <button id="font-toggle" aria-label="切换正文大小">${learning.prefs.largeText ? '标准字号' : '大号正文'}</button></div></div><header class="reader-header"><span class="badge violet">${esc(chapter.tag)}</span><h1>${esc(chapter.title)}</h1>${selected.id === 'overview' ? `<p>${esc(chapter.thesis)}</p>` : ''}<div class="reader-meta"><span>${esc(selected.title)}</span><span>${selected.id === 'overview' ? '含实践建议 ' + esc(chapter.duration) : '当前小节 · 可随时继续'}</span></div></header>${body}<nav class="reader-bottom" aria-label="小节翻页">${position > 0 ? `<a class="button secondary" href="#chapter/${id}/${units[position-1].id}">上一节</a>` : '<a class="button secondary" href="#course">课程目录</a>'}${position < units.length-1 ? `<a class="button" href="#chapter/${id}/${units[position+1].id}">下一节：${esc(units[position+1].title)}</a>` : nextChapter ? `<a class="button" href="#chapter/${nextChapter.id}">进入下一章</a>` : '<a class="button" href="#progress">查看学习成果</a>'}</nav></div></article></div>`;
  $('#chapter-note')?.addEventListener('input', event => { learning.notes[id] = event.target.value; $('#note-status').textContent = save('notes') ? '笔记已保存到当前浏览器。' : '保存失败，请复制笔记并导出备份。'; });
}

function renderMap() {
  $('#content').innerHTML = `<div class="page">${heading('知识地图', '从七个系统层理解技术之间的关系。每个节点都连接到机制、实现、局限与一手资料。')}<div class="filter-bar">${TECH_DOMAINS.map(domain => `<a class="button secondary" href="#map/${domain.id}">${esc(domain.name.replace(/^\d+\s*/,''))}</a>`).join('')}</div>${TECH_DOMAINS.map(domain => `<section class="map-domain" id="domain-${domain.id}"><header><h2>${esc(domain.name)}</h2><p>${esc(domain.summary)}</p></header><div class="topic-grid">${KNOWLEDGE_TOPICS.filter(topic => topic.domain === domain.id).map(topic => `<a class="topic-tile" href="#concept/${topic.id}"><strong>${esc(topic.name)}</strong><small>${esc(topic.definition)}</small></a>`).join('')}</div></section>`).join('')}</div>`;
}
function conceptHtml(topic) {
  const chapter = COURSE_CHAPTERS.find(item => item.topicIds.includes(topic.id));
  return `<div class="reader-tools"><span>${esc(TECH_DOMAINS.find(domain => domain.id === topic.domain)?.name)}</span>${bookmark('concept',topic.id)}</div><h2 class="detail-title">${esc(topic.name)}</h2><p class="lede">${esc(topic.definition)}</p>${[['底层机制',topic.mechanism],['如何实现',topic.implementation],['局限与失败模式',topic.limits],['优化方向',topic.improve]].map(([title,text]) => sectionHtml({title,paragraphs:[text]})).join('')}<h3>关联知识</h3>${topicLinks(topic.related)}${chapter ? `<h3>放回系统理解</h3><a class="text-link" href="#chapter/${chapter.id}">阅读课程：${esc(chapter.title)}</a>` : ''}<h3>一手资料</h3>${sourceLinks(topic.sources)}`;
}
function renderGlossary(topicId) {
  $('#content').innerHTML = `<div class="page">${heading('概念辞典', `${KNOWLEDGE_TOPICS.length} 个技术点。遇到陌生概念时，先理解机制，再回到课程中的完整系统。`, '<label class="sr-only" for="glossary-search">搜索概念</label><input class="inline-search" id="glossary-search" type="search" placeholder="搜索概念或实现细节…" />')}<div class="filter-bar" id="glossary-filters"></div><div class="catalog-layout"><nav class="catalog-list" id="glossary-list" aria-label="概念列表"></nav><article class="detail-panel" id="concept-detail"></article></div></div>`;
  $('#glossary-search').value = glossaryQuery;
  const update = () => {
    const topics = KNOWLEDGE_TOPICS.filter(topic => (glossaryDomain === 'all' || topic.domain === glossaryDomain) && JSON.stringify(topic).toLowerCase().includes(glossaryQuery.toLowerCase()));
    const selected = topics.find(topic => topic.id === topicId) || topics[0];
    $('#glossary-filters').innerHTML = [{id:'all',name:'全部'},...TECH_DOMAINS].map(domain => `<button class="filter-button ${glossaryDomain===domain.id?'active':''}" data-glossary-filter="${domain.id}">${esc(domain.name.replace(/^\d+\s*/,''))}</button>`).join('');
    $('#glossary-list').innerHTML = topics.map(topic => `<a class="catalog-link ${selected?.id===topic.id?'active':''}" href="#concept/${topic.id}"><strong>${esc(topic.name)}</strong><small>${esc(topic.definition.slice(0,55))}</small></a>`).join('') || empty('没有匹配的概念。');
    $('#concept-detail').innerHTML = selected ? conceptHtml(selected) : empty('试试更短的关键词，或切换到全部领域。');
    $('#glossary-filters').querySelectorAll('button').forEach(button => button.addEventListener('click',()=> { glossaryDomain=button.dataset.glossaryFilter; update(); }));
  };
  $('#glossary-search').addEventListener('input',event=> { glossaryQuery=event.target.value; update(); }); update();
}
function renderLabs(id) {
  const lab = LAB_BY_ID[id] || LABS[0];
  const status = LAB_STATUS[lab.id] || ['无密钥教学实验', '用确定性数据验证控制逻辑；完成后再映射到真实 provider 和持久化后端。'];
  $('#content').innerHTML = `<div class="page">${heading('实战实验', '先运行一个可理解的实现，再验证失败边界。实验标明实现范围，帮助你区分原理练习与真实集成。')}<div class="catalog-layout"><nav class="catalog-list" aria-label="实验目录">${LABS.map(item=>`<a class="catalog-link ${item.id===lab.id?'active':''}" href="#lab/${item.id}"><strong>${item.number} ${esc(item.title)}</strong><small>${learning.labs[item.id]?'已完成 · ':''}${esc((LAB_STATUS[item.id] || ['原理实验'])[0])}</small></a>`).join('')}</nav><article class="detail-panel"><div class="reader-tools"><span>实验 ${lab.number}</span>${bookmark('lab',lab.id)}</div><span class="badge amber">${esc(status[0])}</span><h2 class="detail-title">${esc(lab.title)}</h2><p class="lede">${esc(lab.goal)}</p><aside class="callout"><strong>实现范围：</strong>${esc(status[1])}</aside><h2>运行与验证</h2>${codeBlock('cd ai-agent-learning\n'+lab.commands.join('\n'),'终端 · 在仓库根目录运行')}<h2>验收标准</h2>${list(lab.checks)}<h2>带着问题做实验</h2><ol><li>运行测试，检查每条断言保护了什么约束。</li><li>修改一处边界条件，使测试失败并解释原因。</li><li>记录哪些约束由代码保证，哪些依赖外部系统。</li></ol><div class="inline-actions"><a class="button secondary" href="https://github.com/Serendipity-zsh/ai-agent-learning/blob/main/labs/${esc(lab.source)}" target="_blank" rel="noreferrer">阅读实验源码 ↗</a><button class="button" data-complete-lab="${lab.id}" aria-pressed="${!!learning.labs[lab.id]}">${learning.labs[lab.id]?'已完成实验 · 撤销':'标记实验完成'}</button></div></article></div></div>`;
}
function renderProjects(id) {
  if (!id) {
    $('#content').innerHTML = `<div class="page">${heading('源码研读', '沿着入口、数据结构、控制流和持久化边界阅读。先理解设计问题，再对照实现细节。')}<aside class="callout">旧快照保留供复现，核验日期见详情；路径映射与设计推导不等于逐行审计。Claude Code 只分析公开资料。</aside><div class="project-cards">${PROJECT_CASES.map(project=>`<a class="content-card" href="#project/${project.id}"><span class="badge">${esc(project.category)}</span><h3>${esc(project.name)}</h3><p>${esc(project.positioning)}</p><small>架构 · 模块 · 调用链 · 局限</small></a>`).join('')}</div><div class="section-heading"><h2>把项目放在同一张架构图上</h2></div>${table(['问题','主要阅读对象','与其他层的关系'],[['如何组合模型与工具','LangChain','高层 Agent 组装，可下沉到 LangGraph'],['如何恢复执行','LangGraph','状态、调度与 checkpoint'],['如何把文档变成证据','LlamaIndex / Haystack','数据与检索管线，可封装为 Agent 工具'],['如何形成长期记忆','Mem0 / Letta','外置记忆服务与有状态 Agent 的不同取舍'],['如何执行长任务','OpenClaw / Hermes / OpenHands','产品运行时、环境与会话管理']])}</div>`; return;
  }
  const project = PROJECT_BY_ID[id]; if (!project) return renderNotFound();
  const reading = PROJECT_SOURCE_READINGS[id], trace = PROJECT_SOURCE_TRACES[id];
  $('#content').innerHTML = `<div class="reader-layout"><aside class="reader-index"><h2>源码研读</h2><a href="#projects">← 全部项目与对比</a>${PROJECT_CASES.map(item=>`<a href="#project/${item.id}" class="${item.id===id?'active':''}">${esc(item.name)}</a>`).join('')}</aside><article class="reader-main"><div class="reader-body"><div class="reader-tools"><span>${esc(project.category)}</span>${bookmark('project',id)}</div><header class="reader-header"><span class="badge">${esc(project.status)}</span><h1>${esc(project.name)}</h1><p>${esc(project.positioning)}</p></header><section class="reader-section"><h2>整体架构</h2>${diagram(project.architecture)}<h2>每个模块解决什么问题</h2>${table(['模块','职责','具体实现','设计原因'],project.modules.map(module=>[module.name,module.what,module.how,module.why]))}<h2>跟踪一次请求</h2>${list(project.flow,true)}<h2>设计决策</h2>${list(project.decisions)}<h2>局限与改进方向</h2>${list(project.limits)}${list(project.improve)}<h2>和其他项目的关系</h2><p>${esc(project.relations)}</p></section>${reading?`<section class="reader-section"><h2>源码阅读入口</h2><aside class="callout">${esc(reading.ref)}。阅读与证据边界：固定版本用于复现，历史案例已单独标注；路径存在性与逐行行为审计是不同的验证。</aside><p>${esc(reading.chain)}</p>${reading.files.map(file=>`<h3>${esc(file[0])}</h3><p>${esc(file[3])}</p>${sourceLinks([{label:file[1],url:file[2]}])}`).join('')}</section>`:''}${trace?`<section class="reader-section"><h2>${esc(trace.title)}</h2><p>${esc(trace.question)}</p><h3>运行时数据</h3>${list(trace.state)}${trace.steps.map(step=>`<h3>${esc(step[0])}</h3><p>${esc(step[1])}</p><p>${esc(step[2])}</p><aside class="callout">不变量：${esc(step[3])}</aside>`).join('')}<h3>亲手验证</h3>${list(trace.tests,true)}<p>${esc(trace.compare)}</p></section>`:''}<h2>仓库与官方资料</h2>${sourceLinks(project.sources)}</div></article></div>`;
}
function renderFrontier() { $('#content').innerHTML=`<div class="page">${heading('前沿专题', '关注改变系统设计的技术，而不追逐未经验证的名词。每个专题包含机制、实现、边界与官方资料。')}<aside class="callout">资料核验日 ${CONTENT_REVIEW_DATE}。协议、SDK 与模型产品独立演进；旧实验标明其固定版本，不把所有示例视为当前 API。</aside><div class="frontier-grid">${frontierCards()}</div><section class="panel" style="margin-top:24px"><h2>理解一项新技术的五个问题</h2>${list(['它改变了模型、数据、协议还是运行时？','它解决的瓶颈能否在现有 trace 中观察到？','能否在同一任务、数据和预算下对比基线？','成功之外，超时、错误、越权和恢复如何处理？','官方能力、教学推导与尚未验证的假设分别是什么？'],true)}</section></div>`; }
function renderProgress() {
  const stats = LearningState.quizStats(QUIZZES_BY_CHAPTER,learning.quizzes);
  const chapters = COURSE_CHAPTERS.filter(chapter=>learning.chapters[chapter.id]).length;
  const labs = LABS.filter(lab=>learning.labs[lab.id]).length;
  const saved = Object.keys(learning.bookmarks).filter(key=>learning.bookmarks[key]);
  const titleFor = key => { const [kind,id]=key.split('/'); return ({chapter:CHAPTER_BY_ID,project:PROJECT_BY_ID,lab:LAB_BY_ID,concept:TOPIC_BY_ID}[kind]?.[id]); };
  $('#content').innerHTML=`<div class="page">${heading('我的学习', '完成记录、错题、收藏和笔记都在这里。数据保存在当前浏览器，建议定期导出备份。')}<div class="metric-row"><div class="panel"><b>${chapters}<small> / ${COURSE_CHAPTERS.length}</small></b><small>章节完成</small></div><div class="panel"><b>${labs}<small> / ${LABS.length}</small></b><small>实验完成</small></div><div class="panel"><b>${stats.correct}<small> / ${stats.answered}</small></b><small>自测答对 · 当前 ${stats.mistakes.length} 道待复习</small></div></div><div class="dashboard-grid"><div class="panel"><h2>待复习的错题</h2>${stats.mistakes.length?stats.mistakes.map(item=>`<article class="review-item"><span class="badge">第 ${CHAPTER_BY_ID[item.chapterId].number} 章</span><h3>${esc(item.question.q)}</h3><p>你的选择：${esc(item.question.options[item.answer])}</p><a class="text-link" href="#chapter/${item.chapterId}/quiz">返回自测并订正</a></article>`).join(''):empty(stats.answered?'目前没有错题。可以继续下一章。':'完成章节自测后，错题会出现在这里。')}<div class="section-heading"><h2>章节笔记</h2></div>${Object.entries(learning.notes).filter(([id,note])=>CHAPTER_BY_ID[id]&&note.trim()).map(([id,note])=>`<article class="review-item"><a href="#chapter/${id}/quiz">${esc(CHAPTER_BY_ID[id].title)}</a><p style="white-space:pre-wrap">${esc(note)}</p></article>`).join('') || empty('在章节“自测与复盘”中记下你的理解。')}</div><aside class="dashboard-aside"><section class="panel"><h2>备份与恢复</h2><p>导入会合并同名记录，备份内的对应字段优先。导入前会先校验格式。</p><div class="inline-actions"><button class="button" id="export-progress">导出记录</button><label class="button secondary" for="import-progress">导入备份</label><input class="sr-only" type="file" id="import-progress" accept="application/json,.json" /></div><p id="import-status" role="status"></p></section><section class="panel"><h2>我的收藏</h2>${saved.map(key=>{const item=titleFor(key);return item?`<a class="update-item" href="#${esc(key)}">${esc(item.title||item.name)}</a>`:'';}).join('') || '<p>在课程、实验、概念与项目详情点击“收藏”。</p>'}</section></aside></div></div>`;
  $('#export-progress').addEventListener('click',()=> {
    const payload={version:1,exportedAt:new Date().toISOString(),...Object.fromEntries(['chapters','labs','quizzes','notes','bookmarks'].map(name=>[name,learning[name]]))};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='agent-systems-learning.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('#import-progress').addEventListener('change',async event=> {
    const file=event.target.files[0]; if(!file)return;
    try {
      if(file.size>2_000_000)throw new Error('备份文件不能超过 2 MB。');
      const data=LearningState.validateBackup(JSON.parse(await file.text()),COURSE_CHAPTERS.map(item=>item.id),LABS.map(item=>item.id));
      let persisted=true;
      for(const name of ['chapters','labs','quizzes','notes','bookmarks']) { Object.assign(learning[name],data[name]); persisted=save(name)&&persisted; }
      renderProgress(); $('#import-status').textContent=persisted?'记录已导入并保存。':'记录已导入内存，但浏览器保存失败，请立即导出备份。';
    }catch(error){$('#import-status').textContent=`导入失败：${error.message}`;}
  });
}
function renderNotFound() { $('#content').innerHTML=`<div class="page">${heading('这个学习页面不存在', '旧版课程和概念链接仍可使用。你可以回到学习中心，或搜索想找的内容。')}<a class="button" href="#home">返回学习中心</a></div>`; }

const searchIndex = [
  ...KNOWLEDGE_TOPICS.map(item=>({title:item.name,text:JSON.stringify(item),kind:'概念',hash:`concept/${item.id}`})),
  ...COURSE_CHAPTERS.flatMap(item=>[{title:item.title,text:item.thesis,kind:'课程',hash:`chapter/${item.id}`},...item.sections.map((section,index)=>({title:cleanTitle(section.title),text:section.paragraphs.join(' '),kind:'小节',hash:`chapter/${item.id}/${index}`}))]),
  ...DEEP_DIVES.map(item=>({title:item.title,text:JSON.stringify(item),kind:'实现',hash:`chapter/${item.chapterId}/implementation`})),
  ...PROJECT_CASES.map(item=>({title:item.name,text:JSON.stringify(item)+' '+JSON.stringify(PROJECT_SOURCE_TRACES[item.id]||{}),kind:'源码',hash:`project/${item.id}`})),
  ...LABS.map(item=>({title:item.title,text:JSON.stringify(item),kind:'实验',hash:`lab/${item.id}`}))
];
function search(query) {
  const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(!words.length)return [];
  return searchIndex.map(item=>{const title=item.title.toLowerCase(),text=(item.title+' '+item.text).toLowerCase();const score=words.every(word=>text.includes(word))?words.reduce((score,word)=>score+(title===word?100:title.includes(word)?30:4),0):0;return {...item,score};}).filter(item=>item.score).sort((a,b)=>b.score-a.score).slice(0,30);
}
function renderSearch() {
  const query=$('#global-search').value;const results=search(query);searchSelection=0;
  $('#search-hint').textContent=query.trim()?`${results.length} 条结果 · 匹配课程正文、概念、实验与源码`:'试试“幂等”“MCP 2026”“RAG”或“checkpoint”。';
  $('#search-results').innerHTML=results.length?results.map((item,index)=>`<a class="search-result ${index===0?'selected':''}" href="#${item.hash}"><span class="badge">${item.kind}</span> <strong>${esc(item.title)}</strong><p>${esc(item.text.replace(/[{}"\[\]]/g,' ').slice(0,120))}</p></a>`).join(''):empty(query.trim()?'没有匹配结果，试试更短的关键词或英文名称。':'输入关键词，找到你需要的那一节。');
}
function openSearch() { if(!$('#search-dialog').open)$('#search-dialog').showModal();renderSearch();$('#global-search').focus(); }
const mobileLayout = window.matchMedia('(max-width:760px)');
function setMenu(open, restoreFocus = false) {
  $('#site-sidebar').classList.toggle('open', open);
  $('#site-sidebar').inert = mobileLayout.matches && !open;
  $('.site-frame').inert = mobileLayout.matches && open;
  $('#nav-scrim').hidden = !open;
  $('#menu-toggle').setAttribute('aria-expanded',open);
  if(open)$('#menu-close').focus();else if(restoreFocus)$('#menu-toggle').focus();
}
function closeMenu(restoreFocus = false) { setMenu(false,restoreFocus); }
function applyPreferences() { document.documentElement.dataset.theme=learning.prefs.theme||'light';document.documentElement.style.setProperty('--reading-size',learning.prefs.largeText?'19px':'17px');$('#theme-toggle').textContent=learning.prefs.theme==='dark'?'浅色模式':'深色模式';$('#theme-toggle').setAttribute('aria-label',learning.prefs.theme==='dark'?'切换浅色模式':'切换深色模式'); }
function renderDiagrams() {
  const nodes=$('#content').querySelectorAll('.mermaid:not([data-processed])');
  if(!nodes.length)return;
  if(!window.mermaid){
    if(!mermaidLoading){mermaidLoading=true;const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js';script.addEventListener('load',renderDiagrams);script.addEventListener('error',()=>{mermaidLoading=false;announce('架构图组件未加载，可展开文本描述。');});document.head.append(script);}
    return;
  }
  const dark=learning.prefs.theme==='dark';
  window.mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:dark?'dark':'neutral',flowchart:{htmlLabels:false}});
  if(nodes.length)window.mermaid.run({nodes,suppressErrors:true}).catch(()=>announce('部分架构图未渲染，可展开文本描述。'));
}
function route() {
  const raw=location.hash.slice(1)||'home'; const [kind,id,unit]=raw.split('/');
  const view=({chapter:'course',concept:'glossary',topic:'glossary',lab:'labs',project:'projects'})[kind]||kind;
  const nav=navigation.find(item=>item[0]===view);
  $('#main-nav').innerHTML=`<div class="nav-label">学习空间</div>${navigation.map(([key,label,symbol])=>`<a class="nav-link ${key===view?'active':''}" href="#${key}" ${key===view?'aria-current="page"':''}><span class="nav-symbol" aria-hidden="true">${symbol}</span>${label}</a>`).join('')}`;
  $('#breadcrumbs').textContent=nav?nav[1]:'学习中心';
  if(kind==='home')renderHome(); else if(kind==='course')renderCourse(); else if(kind==='chapter')renderChapter(id,unit); else if(kind==='map')renderMap(); else if(kind==='glossary')renderGlossary(); else if(kind==='concept'||kind==='topic'){glossaryQuery='';glossaryDomain='all';if(TOPIC_BY_ID[id])renderGlossary(id);else renderNotFound();} else if(kind==='labs'||kind==='lab')renderLabs(id); else if(kind==='projects'||kind==='project')renderProjects(id); else if(kind==='frontier')renderFrontier(); else if(kind==='progress')renderProgress(); else renderNotFound();
  document.title=($('#content .detail-title')?.textContent||$('#content h1')?.textContent||'学习中心')+' · Agent Systems';
  closeMenu();applyPreferences();renderDiagrams();
  if(activeRoute!==raw) { window.scrollTo(0,0); if(activeRoute)$('#content').focus({preventScroll:true}); }
  activeRoute=raw;
  if(kind==='map'&&id)document.getElementById('domain-'+id)?.scrollIntoView();
}
$('#content').addEventListener('click',async event=> {
  const button=event.target.closest('button'); if(!button)return;
  if(button.matches('[data-bookmark]')) { const key=button.dataset.bookmark;learning.bookmarks[key]=!learning.bookmarks[key];save('bookmarks');button.textContent=learning.bookmarks[key]?'已收藏':'收藏';button.setAttribute('aria-pressed',learning.bookmarks[key]); }
  if(button.matches('[data-complete-chapter]')) { const id=button.dataset.completeChapter;learning.chapters[id]=!learning.chapters[id];save('chapters');button.textContent=learning.chapters[id]?'已完成本章 · 撤销':'标记本章完成';button.setAttribute('aria-pressed',!!learning.chapters[id]);announce(button.textContent); }
  if(button.matches('[data-complete-lab]')) { const id=button.dataset.completeLab;learning.labs[id]=!learning.labs[id];save('labs');button.textContent=learning.labs[id]?'已完成实验 · 撤销':'标记实验完成';button.setAttribute('aria-pressed',!!learning.labs[id]); }
  if(button.matches('[data-answer]')) {
    const {quizChapter:id,question:index,answer}=button.dataset;const question=QUIZZES_BY_CHAPTER[id][Number(index)];
    if(!learning.quizzes[id]||typeof learning.quizzes[id]!=='object')learning.quizzes[id]={};learning.quizzes[id][index]=Number(answer);save('quizzes');
    const fieldset=button.closest('fieldset');fieldset.querySelectorAll('[data-answer]').forEach(option=> {const chosen=option===button;option.classList.toggle('correct',chosen&&Number(answer)===question.answer);option.classList.toggle('wrong',chosen&&Number(answer)!==question.answer);option.setAttribute('aria-pressed',chosen);});
    const feedback=fieldset.querySelector('.quiz-feedback');feedback.hidden=false;feedback.innerHTML=`<p>${Number(answer)===question.answer?'回答正确。':'需要再想一想。'}${esc(question.why)}</p>`;
  }
  if(button.id==='font-toggle') { learning.prefs.largeText=!learning.prefs.largeText;save('prefs');applyPreferences();button.textContent=learning.prefs.largeText?'标准字号':'大号正文'; }
  if(button.classList.contains('copy-code')) { const text=button.closest('.code-shell').querySelector('code').textContent;try{await navigator.clipboard.writeText(text);button.textContent='已复制';}catch{button.textContent='请选中代码复制';} }
});
document.querySelectorAll('[data-open-search]').forEach(button=>button.addEventListener('click',openSearch));
$('#search-close').addEventListener('click',()=>$('#search-dialog').close());
$('#search-dialog').addEventListener('click',event=>{if(event.target.closest('.search-result'))$('#search-dialog').close();});
$('#global-search').addEventListener('input',renderSearch);
$('#global-search').addEventListener('keydown',event=> {
  const results=[...document.querySelectorAll('.search-result')];if(!results.length)return;
  if(event.key==='Enter'){event.preventDefault();results[searchSelection].click();}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();searchSelection=(searchSelection+(event.key==='ArrowDown'?1:-1)+results.length)%results.length;results.forEach((result,index)=>result.classList.toggle('selected',index===searchSelection));results[searchSelection].scrollIntoView({block:'nearest'});}
});
document.addEventListener('keydown',event=> {
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSearch();}
  if(event.key==='Escape'&&$('#site-sidebar').classList.contains('open')&&!$('#search-dialog').open)closeMenu(true);
  if(event.key==='Tab'&&mobileLayout.matches&&$('#site-sidebar').classList.contains('open')){
    const items=[...$('#site-sidebar').querySelectorAll('a,button')];const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
$('#menu-toggle').addEventListener('click',()=>setMenu(true));
$('#menu-close').addEventListener('click',()=>closeMenu(true));
$('#nav-scrim').addEventListener('click',()=>closeMenu(true));
mobileLayout.addEventListener('change',()=>closeMenu());
$('.skip-link').addEventListener('click',event=> {event.preventDefault();$('#content').focus();$('#content').scrollIntoView();});
$('#theme-toggle').addEventListener('click',()=> {learning.prefs.theme=learning.prefs.theme==='dark'?'light':'dark';save('prefs');applyPreferences();});
window.addEventListener('hashchange',route);
route();
