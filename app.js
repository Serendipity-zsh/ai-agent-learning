const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const domainFor = topic => TECH_DOMAINS.find(domain => domain.id === topic.domain);
const shortDomainName = domain => domain.name.replace(/^\d+\s*/, '');
const progress = JSON.parse(localStorage.getItem('agent-systems-progress') || '{}');

let activeView = 'map';
let activeTopic = KNOWLEDGE_TOPICS[0].id;
let activeMapDomain = 'all';
let activeGlossaryDomain = 'all';
let activeChapter = COURSE_CHAPTERS[0].id;
let activeProject = PROJECT_CASES[0].id;
let activeLab = LABS[0].id;
let mobileInspectorOpen = false;
let searchSelection = -1;
let lastSearchTrigger = null;

const RELATION_LINKS = {
  langchain: ['langgraph'], langgraph: ['langchain'], llamaindex: ['haystack'], haystack: ['llamaindex'],
  mem0: ['letta', 'openclaw'], letta: ['mem0'], openclaw: ['hermes', 'langgraph'], hermes: ['openclaw'],
  'claude-code': ['openhands'], openhands: ['claude-code'], autogen: ['langgraph']
};

if (window.mermaid) {
  window.mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'strict',
    themeVariables: {
      primaryColor: '#eaf2ff', primaryBorderColor: '#1769ff', primaryTextColor: '#0b1728',
      secondaryColor: '#edf8f8', tertiaryColor: '#fff7e8', lineColor: '#60748b',
      fontFamily: 'Inter, Noto Sans SC, sans-serif', fontSize: '13px'
    },
    flowchart: { curve: 'basis', htmlLabels: true }
  });
}

function renderMermaid(root) {
  if (!window.mermaid || !root) return;
  const nodes = root.querySelectorAll('.mermaid:not([data-processed])');
  if (nodes.length) window.mermaid.run({ nodes }).catch(error => console.warn('Mermaid render failed', error));
}

function sourceLinks(sources = []) {
  return sources.length ? `<div class="source-links">${sources.map(source => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} ↗</a>`).join('')}</div>` : '<p>暂无外部链接。</p>';
}

function topicButton(id, className = 'tag-button') {
  const topic = TOPIC_BY_ID[id];
  return topic
    ? `<button class="${className}" data-concept="${escapeHtml(id)}">${escapeHtml(topic.name)}</button>`
    : `<span class="${className}">${escapeHtml(id)}</span>`;
}

function bindConceptLinks(root, targetView = 'glossary') {
  root.querySelectorAll('[data-concept]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.concept;
    if (!TOPIC_BY_ID[id]) {
      openSearch(id);
      return;
    }
    location.hash = targetView === 'map' ? `topic/${id}` : `concept/${id}`;
  }));
}

function setView(view) {
  activeView = view;
  document.querySelectorAll('[data-view-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.viewPanel === view));
  document.querySelectorAll('[data-view]').forEach(button => {
    const selected = button.dataset.view === view;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-current', selected ? 'page' : 'false');
  });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function renderMap() {
  document.querySelector('#topic-count').textContent = KNOWLEDGE_TOPICS.length;
  document.querySelector('#glossary-count').textContent = KNOWLEDGE_TOPICS.length;
  document.querySelector('#chapter-count').textContent = COURSE_CHAPTERS.length;
  document.querySelector('#project-count').textContent = PROJECT_CASES.length;
  const rail = document.querySelector('#domain-rail');
  rail.innerHTML = TECH_DOMAINS.map((domain, index) => {
    const count = KNOWLEDGE_TOPICS.filter(topic => topic.domain === domain.id).length;
    return `<button class="domain-link ${activeMapDomain === domain.id ? 'active' : ''}" style="--domain:${domain.color}" data-domain="${domain.id}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(shortDomainName(domain))}</strong><small>${count}</small></button>`;
  }).join('');
  rail.querySelectorAll('[data-domain]').forEach(button => button.addEventListener('click', () => {
    activeMapDomain = button.dataset.domain;
    renderMap();
    document.querySelector(`#domain-${activeMapDomain}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  document.querySelector('#domain-map').innerHTML = TECH_DOMAINS.map((domain, index) => {
    const topics = KNOWLEDGE_TOPICS.filter(topic => topic.domain === domain.id);
    return `<section class="domain-block" id="domain-${domain.id}" style="--domain:${domain.color}">
      <header class="domain-block-head"><span class="domain-number">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(shortDomainName(domain))}</h3><p>${escapeHtml(domain.summary)}</p></header>
      <div class="topic-nodes">${topics.map((topic, topicIndex) => `<button class="topic-node ${topic.id === activeTopic ? 'active' : ''}" data-map-topic="${topic.id}"><span>${domain.id} / ${String(topicIndex + 1).padStart(2, '0')}</span><strong>${escapeHtml(topic.name)}</strong><small>${escapeHtml(topic.definition)}</small></button>`).join('')}</div>
    </section>`;
  }).join('');
  document.querySelectorAll('[data-map-topic]').forEach(button => button.addEventListener('click', () => { mobileInspectorOpen = true; location.hash = `topic/${button.dataset.mapTopic}`; }));
  renderMapInspector();
}

function renderMapInspector() {
  const topic = TOPIC_BY_ID[activeTopic] || KNOWLEDGE_TOPICS[0];
  const domain = domainFor(topic);
  const inspector = document.querySelector('#map-inspector');
  inspector.style.setProperty('--topic-color', domain.color);
  inspector.innerHTML = `<button class="inspector-close" aria-label="关闭详情">×</button>
    <header class="inspector-head"><span class="topic-code">${escapeHtml(domain.name)} / ${escapeHtml(topic.id)}</span><h2>${escapeHtml(topic.name)}</h2><p>${escapeHtml(topic.definition)}</p></header>
    <section class="topic-section"><h3>底层机制 / HOW IT WORKS</h3><p>${escapeHtml(topic.mechanism)}</p></section>
    <section class="topic-section"><h3>工程实现 / HOW TO BUILD</h3><p>${escapeHtml(topic.implementation)}</p></section>
    <section class="topic-section limit"><h3>局限与失败模式</h3><p>${escapeHtml(topic.limits)}</p></section>
    <section class="topic-section improve"><h3>优化方向</h3><p>${escapeHtml(topic.improve)}</p></section>
    <section class="topic-section"><h3>关联知识</h3><div class="tag-list">${topic.related.map(id => topicButton(id)).join('')}</div></section>
    <section class="topic-section"><h3>一手资料</h3>${sourceLinks(topic.sources)}</section>`;
  inspector.classList.toggle('open', !window.matchMedia('(max-width: 980px)').matches || mobileInspectorOpen);
  inspector.querySelector('.inspector-close').addEventListener('click', () => { mobileInspectorOpen = false; inspector.classList.remove('open'); });
  bindConceptLinks(inspector, 'map');
}

function renderChapterNav() {
  const nav = document.querySelector('#chapter-nav');
  nav.innerHTML = COURSE_CHAPTERS.map(chapter => `<button class="chapter-tab ${chapter.id === activeChapter ? 'active' : ''}" data-chapter="${chapter.id}"><span>${chapter.number}</span><span><strong>${escapeHtml(chapter.title)}</strong><small>${escapeHtml(chapter.tag)} · ${escapeHtml(chapter.duration)}${progress[chapter.id] ? ' · DONE' : ''}</small></span></button>`).join('');
  nav.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click', () => { location.hash = `chapter/${button.dataset.chapter}`; }));
  const complete = COURSE_CHAPTERS.filter(chapter => progress[chapter.id]).length;
  document.querySelector('#progress-label').textContent = `${complete} / ${COURSE_CHAPTERS.length} 章完成`;
  document.querySelector('#progress-fill').style.width = `${complete / COURSE_CHAPTERS.length * 100}%`;
}

function renderChapter() {
  const chapter = CHAPTER_BY_ID[activeChapter] || COURSE_CHAPTERS[0];
  const deepDive = DEEP_DIVE_BY_CHAPTER[chapter.id];
  const article = document.querySelector('#chapter-article');
  const index = COURSE_CHAPTERS.findIndex(item => item.id === chapter.id);
  article.innerHTML = `<header class="chapter-header">
      <div class="chapter-kicker"><span>CH ${chapter.number}</span>${escapeHtml(chapter.tag)} · ${escapeHtml(chapter.duration)}</div>
      <h1>${escapeHtml(chapter.title)}</h1><p class="chapter-thesis">${escapeHtml(chapter.thesis)}</p>
    </header>
    <section class="objectives"><h2>完成本章后，你应该能够</h2><ul>${chapter.objectives.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
    <div class="diagram-shell"><span class="diagram-label">SYSTEM MODEL / 本章系统模型</span><div class="mermaid">${escapeHtml(chapter.diagram)}</div></div>
    ${chapter.sections.map((section, sectionIndex) => `<section class="chapter-section" id="${chapter.id}-section-${sectionIndex}"><h2><span>${String(sectionIndex + 1).padStart(2, '0')}</span>${escapeHtml(section.title)}</h2>${section.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}${section.callout ? `<div class="callout">${escapeHtml(section.callout)}</div>` : ''}${section.diagram ? `<div class="diagram-shell"><div class="mermaid">${escapeHtml(section.diagram)}</div></div>` : ''}${section.code ? `<pre><code>${escapeHtml(section.code)}</code></pre>` : ''}</section>`).join('')}
    ${deepDive ? renderDeepDive(deepDive) : ''}
    <section class="lab-card"><p class="eyebrow">BUILD / TEST / EXPLAIN</p><h2>${escapeHtml(chapter.lab.title)}</h2><div class="lab-grid"><div><h3>实验步骤</h3><ol>${chapter.lab.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol></div><div><h3>可验证的验收标准</h3><ul>${chapter.lab.acceptance.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></div></section>
    <div class="chapter-actions"><button class="pager-button" data-page-chapter="${index > 0 ? COURSE_CHAPTERS[index - 1].id : ''}" ${index > 0 ? '' : 'disabled'}>← 上一章</button><button class="complete-chapter ${progress[chapter.id] ? 'done' : ''}" data-complete-chapter="${chapter.id}">${progress[chapter.id] ? '✓ 本章已完成' : '标记本章完成'}</button><button class="pager-button" data-page-chapter="${index < COURSE_CHAPTERS.length - 1 ? COURSE_CHAPTERS[index + 1].id : ''}" ${index < COURSE_CHAPTERS.length - 1 ? '' : 'disabled'}>下一章 →</button></div>`;
  document.querySelector('#section-toc').innerHTML = chapter.sections.map((section, sectionIndex) => `<button data-section-target="${chapter.id}-section-${sectionIndex}">${escapeHtml(section.title)}</button>`).join('');
  document.querySelectorAll('[data-section-target]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.sectionTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  document.querySelector('#chapter-topics').innerHTML = chapter.topicIds.map(id => topicButton(id, 'chapter-topic')).join('');
  bindConceptLinks(document.querySelector('#chapter-topics'));
  article.querySelector('[data-complete-chapter]').addEventListener('click', () => {
    progress[chapter.id] = !progress[chapter.id];
    localStorage.setItem('agent-systems-progress', JSON.stringify(progress));
    renderChapterNav(); renderChapter();
  });
  article.querySelectorAll('[data-page-chapter]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.pageChapter) location.hash = `chapter/${button.dataset.pageChapter}`;
  }));
  renderMermaid(article);
}

function renderDeepDive(dive) {
  return `<section class="deep-dive"><header><p class="eyebrow">${escapeHtml(dive.label)} / IMPLEMENTATION LAB</p><h2>${escapeHtml(dive.title)}</h2><p>${escapeHtml(dive.premise)}</p></header>
    <section class="deep-section"><h3>从第一性原理推导</h3>${dive.derivation.map(item => `<p>${escapeHtml(item)}</p>`).join('')}</section>
    <div class="diagram-shell"><span class="diagram-label">EXECUTION MODEL</span><div class="mermaid">${escapeHtml(dive.model)}</div></div>
    <section class="deep-section"><h3>最小参考实现</h3><pre><code>${escapeHtml(dive.code)}</code></pre></section>
    <section class="deep-section"><h3>一次运行的 Trace</h3><ol class="flow-list">${dive.trace.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol></section>
    <section class="deep-section"><h3>故障注入与修复</h3><div class="failure-table"><table><thead><tr><th>故障</th><th>它为什么发生</th><th>工程修复</th></tr></thead><tbody>${dive.failures.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>
    <section class="deep-section"><h3>掌握检查</h3><ol class="drill-list">${dive.drills.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol><div class="answer-key"><strong>判题标准：</strong>${escapeHtml(dive.answer)}</div></section>
    <section class="deep-section"><h3>映射到开源实现：按调用链阅读</h3><div class="source-map">${dive.sourceMap.map(row => `<article><strong>${escapeHtml(row[0])}</strong><code>${escapeHtml(row[1])}</code><p>${escapeHtml(row[2])}</p></article>`).join('')}</div></section>
  </section>`;
}

function renderCourse() { renderChapterNav(); renderChapter(); }

function conceptArticle(topic) {
  const domain = domainFor(topic);
  return `<header class="concept-header" style="--topic-color:${domain.color}"><span>${escapeHtml(domain.name)} / ${escapeHtml(topic.id)}</span><h2>${escapeHtml(topic.name)}</h2><p>${escapeHtml(topic.definition)}</p></header>
    <div class="concept-grid">
      <section class="topic-section"><h3>01 · 底层机制</h3><p>${escapeHtml(topic.mechanism)}</p></section>
      <section class="topic-section"><h3>02 · 工程实现</h3><p>${escapeHtml(topic.implementation)}</p></section>
      <section class="topic-section limit"><h3>03 · 局限与失败模式</h3><p>${escapeHtml(topic.limits)}</p></section>
      <section class="topic-section improve"><h3>04 · 优化方向</h3><p>${escapeHtml(topic.improve)}</p></section>
    </div>
    <section class="topic-section"><h3>关联知识</h3><div class="tag-list">${topic.related.map(id => topicButton(id)).join('')}</div></section>
    <section class="topic-section"><h3>一手资料 / SOURCE</h3>${sourceLinks(topic.sources)}</section>`;
}

function renderGlossary() {
  const filters = document.querySelector('#glossary-filters');
  filters.innerHTML = `<button class="filter-button ${activeGlossaryDomain === 'all' ? 'active' : ''}" data-filter="all">全部 · ${KNOWLEDGE_TOPICS.length}</button>${TECH_DOMAINS.map(domain => `<button class="filter-button ${activeGlossaryDomain === domain.id ? 'active' : ''}" data-filter="${domain.id}">${escapeHtml(shortDomainName(domain))} · ${KNOWLEDGE_TOPICS.filter(topic => topic.domain === domain.id).length}</button>`).join('')}`;
  filters.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { activeGlossaryDomain = button.dataset.filter; renderGlossary(); }));
  const query = document.querySelector('#glossary-search').value.trim().toLowerCase();
  const domainRank = Object.fromEntries(TECH_DOMAINS.map((domain, index) => [domain.id, index]));
  const matchRank = topic => !query ? 1 : topic.name.toLowerCase() === query ? 100 : topic.name.toLowerCase().startsWith(query) ? 80 : topic.id.includes(query) ? 70 : JSON.stringify(topic).toLowerCase().includes(query) ? 20 : 0;
  const topics = KNOWLEDGE_TOPICS.filter(topic => (activeGlossaryDomain === 'all' || topic.domain === activeGlossaryDomain) && matchRank(topic)).sort((a, b) => matchRank(b) - matchRank(a) || domainRank[a.domain] - domainRank[b.domain]);
  if (topics.length && !topics.some(topic => topic.id === activeTopic)) activeTopic = topics[0].id;
  document.querySelector('#glossary-index').innerHTML = topics.length ? topics.map(topic => {
    const domain = domainFor(topic);
    return `<button class="glossary-card ${topic.id === activeTopic ? 'active' : ''}" style="--topic-color:${domain.color}" data-glossary-topic="${topic.id}"><span>${escapeHtml(shortDomainName(domain))}</span><strong>${escapeHtml(topic.name)}</strong><small>${escapeHtml(topic.definition)}</small></button>`;
  }).join('') : '<div class="empty-result">没有匹配的概念。试试“状态”“检索”或“权限”。</div>';
  document.querySelectorAll('[data-glossary-topic]').forEach(button => button.addEventListener('click', () => { location.hash = `concept/${button.dataset.glossaryTopic}`; }));
  if (!topics.length) { document.querySelector('#concept-article').innerHTML = '<div class="empty-detail"><h2>没有匹配的词条</h2><p>试试英文术语、实现名或更短的关键词。</p></div>'; return; }
  renderConceptArticle();
}

function renderConceptArticle() {
  const topic = TOPIC_BY_ID[activeTopic] || KNOWLEDGE_TOPICS[0];
  const article = document.querySelector('#concept-article');
  article.style.setProperty('--topic-color', domainFor(topic).color);
  article.innerHTML = conceptArticle(topic);
  bindConceptLinks(article);
}

function renderProjectIndex() {
  const groups = [...new Set(PROJECT_CASES.map(project => project.category))];
  document.querySelector('#project-index').innerHTML = groups.map(group => `<div class="project-group">${escapeHtml(group)}</div>${PROJECT_CASES.filter(project => project.category === group).map(project => `<button class="project-tab ${project.id === activeProject ? 'active' : ''}" data-project="${project.id}"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.status)}</small></button>`).join('')}`).join('');
  document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => { location.hash = `project/${button.dataset.project}`; }));
}

function renderProject() {
  const project = PROJECT_BY_ID[activeProject] || PROJECT_CASES[0];
  const reading = PROJECT_SOURCE_READINGS[project.id];
  const trace = PROJECT_SOURCE_TRACES[project.id];
  const article = document.querySelector('#project-article');
  article.innerHTML = `<header class="project-title-row"><div><p class="eyebrow">${escapeHtml(project.category)} / ARCHITECTURE</p><h1>${escapeHtml(project.name)}</h1><p>${escapeHtml(project.relations)}</p></div><span class="status-badge">${escapeHtml(project.status)}</span></header>
    <div class="project-positioning"><strong>项目定位：</strong>${escapeHtml(project.positioning)}</div>
    <section class="project-section"><h2>整体架构</h2><div class="diagram-shell"><div class="mermaid">${escapeHtml(project.architecture)}</div></div></section>
    <section class="project-section"><h2>模块级源码解读</h2><table class="module-table"><thead><tr><th>模块 / 路径</th><th>做什么</th><th>怎么实现</th><th>为什么这样设计</th></tr></thead><tbody>${project.modules.map(module => `<tr><td>${escapeHtml(module.name)}</td><td>${escapeHtml(module.what)}</td><td>${escapeHtml(module.how)}</td><td>${escapeHtml(module.why)}</td></tr>`).join('')}</tbody></table></section>
    <section class="project-section"><h2>一次请求如何流动</h2><ol class="flow-list">${project.flow.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol></section>
    <section class="project-section"><h2>关键设计决策</h2><ul class="decision-list">${project.decisions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
    <section class="project-section"><div class="risk-grid"><div class="risk-box"><h3>LIMITATIONS / 局限</h3><ul>${project.limits.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div class="risk-box improvement"><h3>NEXT / 优化方向</h3><ul>${project.improve.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></div></section>
    ${reading ? `<section class="project-section source-reading"><h2>固定源码快照与调用链</h2><p><strong>阅读链：</strong>${escapeHtml(reading.chain)}</p><p class="source-ref">${escapeHtml(reading.ref)}。快照用于本课程定位；学习时如切换到新版，请重新核验路径与行为。</p><div class="reading-files">${reading.files.map(file => `<a href="${escapeHtml(file[2])}" target="_blank" rel="noreferrer"><strong>${escapeHtml(file[0])}</strong><code>${escapeHtml(file[1])}</code><span>${escapeHtml(file[3])}</span></a>`).join('')}</div></section>` : ''}
    ${trace ? renderProjectTrace(trace) : ''}
    <section class="project-section"><h2>源码与官方资料</h2>${sourceLinks(project.sources)}</section>`;
  const related = (RELATION_LINKS[project.id] || []).map(id => PROJECT_BY_ID[id]).filter(Boolean);
  document.querySelector('#compare-panel').innerHTML = `<p class="eyebrow">RELATIONSHIP</p><h2>它与其他项目的关系</h2><div class="relation-card"><p>${escapeHtml(project.relations)}</p></div>${related.length ? `<div class="compare-links"><span class="eyebrow">继续对照阅读</span>${related.map(item => `<button data-related-project="${item.id}"><strong>${escapeHtml(item.name)}</strong><br />${escapeHtml(item.category)}</button>`).join('')}</div>` : ''}<div class="relation-card"><p><strong>推荐阅读顺序：</strong><br />先看定位与架构，再沿模块路径进入源码，最后用请求流程验证自己的理解。</p></div>`;
  document.querySelectorAll('[data-related-project]').forEach(button => button.addEventListener('click', () => { location.hash = `project/${button.dataset.relatedProject}`; }));
  renderMermaid(article);
}

function renderProjectTrace(trace) {
  return `<section class="project-section source-trace"><header><p class="eyebrow">CODE WALKTHROUGH / TRACE THE RUNTIME</p><h2>${escapeHtml(trace.title)}</h2><p>${escapeHtml(trace.question)}</p></header><section><h3>先画出运行时数据</h3><ul class="state-list">${trace.state.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><section><h3>按调用链阅读</h3><div class="trace-steps">${trace.steps.map((step, index) => `<article><span>${String(index + 1).padStart(2, '0')}</span><div><h4>${escapeHtml(step[0])}</h4><p><strong>读：</strong>${escapeHtml(step[1])}</p><p><strong>变：</strong>${escapeHtml(step[2])}</p><p class="trace-invariant"><strong>不变量：</strong>${escapeHtml(step[3])}</p></div></article>`).join('')}</div></section><section><h3>你应该亲手验证的测试</h3><ol class="flow-list">${trace.tests.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol></section><section class="trace-compare"><h3>与其他项目的边界差异</h3><p>${escapeHtml(trace.compare)}</p></section></section>`;
}

function renderProjects() { renderProjectIndex(); renderProject(); }

function renderLabs() {
  const lab = LAB_BY_ID[activeLab] || LABS[0];
  document.querySelector('#lab-path').innerHTML = LABS.map(item => `<button class="lab-path-step ${item.id === lab.id ? 'active' : ''}" data-lab="${item.id}">${item.number}</button>`).join('');
  document.querySelector('#lab-index').innerHTML = LABS.map(item => `<button class="lab-tab ${item.id === lab.id ? 'active' : ''}" data-lab="${item.id}"><span>LAB ${item.number}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.chapter)}</small></button>`).join('');
  document.querySelector('#lab-article').innerHTML = `<header class="lab-detail-head"><p class="eyebrow">LAB ${lab.number} / ${escapeHtml(lab.chapter)}</p><h1>${escapeHtml(lab.title)}</h1><p>${escapeHtml(lab.goal)}</p></header><section class="project-section"><h2>你将建立的能力</h2><div class="tag-list">${lab.concepts.map(name => `<span class="tag-button">${escapeHtml(name)}</span>`).join('')}</div></section><section class="project-section"><h2>运行与验证</h2><pre><code>cd ai-agent-learning\n${escapeHtml(lab.commands.join('\n'))}</code></pre><h3>验收标准</h3><ul class="decision-list">${lab.checks.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><section class="project-section"><h2>学习顺序</h2><ol class="flow-list"><li>先阅读实验说明和失败场景。</li><li>运行测试，观察约束的可执行定义。</li><li>修改实现使一个测试失败，再解释为什么它是安全边界。</li><li>最后把相同契约映射回课程和开源项目。</li></ol></section><a class="lab-source-link" href="https://github.com/Serendipity-zsh/ai-agent-learning/blob/main/labs/${escapeHtml(lab.source)}" target="_blank" rel="noreferrer">阅读实验说明与源码 ↗</a>`;
  document.querySelectorAll('[data-lab]').forEach(button => button.addEventListener('click', () => { location.hash = `lab/${button.dataset.lab}`; }));
}

function searchCorpus(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const makeResults = (items, kind, title, summary, hash) => items.map(item => {
    const heading = title(item).toLowerCase(); const id = item.id.toLowerCase(); const body = JSON.stringify(item).toLowerCase();
    const score = heading === q ? 100 : id === q ? 96 : heading.startsWith(q) ? 84 : id.startsWith(q) ? 78 : body.includes(q) ? 20 : 0;
    return score ? { kind, id: item.id, title: title(item), summary: summary(item), hash: hash(item), score } : null;
  }).filter(Boolean);
  return [
    ...makeResults(KNOWLEDGE_TOPICS, '概念', item => item.name, item => item.definition, item => `concept/${item.id}`),
    ...makeResults(COURSE_CHAPTERS, '课程', item => `${item.number} · ${item.title}`, item => item.thesis, item => `chapter/${item.id}`),
    ...makeResults(PROJECT_CASES, '源码', item => item.name, item => item.positioning, item => `project/${item.id}`),
    ...makeResults(LABS, '实验', item => item.title, item => item.goal, item => `lab/${item.id}`)
  ].sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind, 'zh-CN')).slice(0, 40);
}

function openSearch(initial = '') {
  lastSearchTrigger = document.activeElement;
  const layer = document.querySelector('#search-layer');
  layer.hidden = false;
  const input = document.querySelector('#global-search');
  input.value = initial;
  renderSearchResults();
  requestAnimationFrame(() => input.focus());
}

function closeSearch() { document.querySelector('#search-layer').hidden = true; lastSearchTrigger?.focus?.(); }

function renderSearchResults() {
  const input = document.querySelector('#global-search');
  const results = searchCorpus(input.value);
  document.querySelector('#search-hint').textContent = input.value.trim() ? `找到 ${results.length} 条结果，标题精确命中优先显示。` : `输入关键词，检索 ${KNOWLEDGE_TOPICS.length} 个技术点、${COURSE_CHAPTERS.length} 章课程、${LABS.length} 个实验与 ${PROJECT_CASES.length} 个项目案例。`;
  searchSelection = results.length ? 0 : -1;
  document.querySelector('#search-results').innerHTML = results.length ? results.map((result, index) => `<button class="search-result ${index === 0 ? 'selected' : ''}" role="option" aria-selected="${index === 0}" data-result-hash="${result.hash}"><span>${result.kind}</span><span><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(result.summary)}</small></span></button>`).join('') : '<p class="empty-search">没有匹配结果。请改用更短关键词或英文实现名。</p>';
  document.querySelectorAll('[data-result-hash]').forEach(button => button.addEventListener('click', () => { closeSearch(); location.hash = button.dataset.resultHash; }));
}

function route() {
  const [kind = 'map', id] = location.hash.replace(/^#/, '').split('/');
  if (kind === 'topic' && TOPIC_BY_ID[id]) { activeTopic = id; setView('map'); renderMap(); return; }
  if (kind === 'concept' && TOPIC_BY_ID[id]) { activeTopic = id; activeGlossaryDomain = 'all'; setView('glossary'); renderGlossary(); return; }
  if (kind === 'chapter' && CHAPTER_BY_ID[id]) { activeChapter = id; setView('course'); renderCourse(); return; }
  if (kind === 'lab' && LAB_BY_ID[id]) { activeLab = id; setView('labs'); renderLabs(); return; }
  if (kind === 'project' && PROJECT_BY_ID[id]) { activeProject = id; setView('projects'); renderProjects(); return; }
  if (['map', 'course', 'labs', 'glossary', 'projects'].includes(kind)) { setView(kind); if (kind === 'map') renderMap(); if (kind === 'course') renderCourse(); if (kind === 'labs') renderLabs(); if (kind === 'glossary') renderGlossary(); if (kind === 'projects') renderProjects(); return; }
  location.hash = 'map';
}

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { location.hash = button.dataset.view; }));
document.querySelector('#search-trigger').addEventListener('click', () => openSearch());
document.querySelector('#search-close').addEventListener('click', closeSearch);
document.querySelector('#search-layer').addEventListener('click', event => { if (event.target.id === 'search-layer') closeSearch(); });
document.querySelector('#global-search').addEventListener('input', renderSearchResults);
document.querySelector('#glossary-search').addEventListener('input', renderGlossary);
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
  const open = !document.querySelector('#search-layer').hidden;
  if (event.key === 'Escape' && open) closeSearch();
  if (!open || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
  const items = [...document.querySelectorAll('.search-result')];
  if (event.key === 'Enter' && searchSelection >= 0) { event.preventDefault(); items[searchSelection]?.click(); return; }
  event.preventDefault();
  searchSelection = event.key === 'ArrowDown' ? Math.min(searchSelection + 1, items.length - 1) : Math.max(searchSelection - 1, 0);
  items.forEach((item, index) => { const selected = index === searchSelection; item.classList.toggle('selected', selected); item.setAttribute('aria-selected', selected); });
  items[searchSelection]?.scrollIntoView({ block: 'nearest' });
});
window.addEventListener('hashchange', route);

route();
