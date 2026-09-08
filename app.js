const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const domainFor = topic => TECH_DOMAINS.find(domain => domain.id === topic.domain);
const shortDomainName = domain => domain.name.replace(/^\d+\s*/, '');
const progress = JSON.parse(localStorage.getItem('agent-systems-progress') || '{}');

let activeView = 'map';
let activeTopic = KNOWLEDGE_TOPICS[0].id;
let activeDomain = 'all';
let activeChapter = COURSE_CHAPTERS[0].id;
let activeProject = PROJECT_CASES[0].id;

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
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
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
    return `<button class="domain-link ${activeDomain === domain.id ? 'active' : ''}" style="--domain:${domain.color}" data-domain="${domain.id}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(shortDomainName(domain))}</strong><small>${count}</small></button>`;
  }).join('');
  rail.querySelectorAll('[data-domain]').forEach(button => button.addEventListener('click', () => {
    activeDomain = button.dataset.domain;
    renderMap();
    document.querySelector(`#domain-${activeDomain}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  document.querySelector('#domain-map').innerHTML = TECH_DOMAINS.map((domain, index) => {
    const topics = KNOWLEDGE_TOPICS.filter(topic => topic.domain === domain.id);
    return `<section class="domain-block" id="domain-${domain.id}" style="--domain:${domain.color}">
      <header class="domain-block-head"><span class="domain-number">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(shortDomainName(domain))}</h3><p>${escapeHtml(domain.summary)}</p></header>
      <div class="topic-nodes">${topics.map((topic, topicIndex) => `<button class="topic-node ${topic.id === activeTopic ? 'active' : ''}" data-map-topic="${topic.id}"><span>${domain.id} / ${String(topicIndex + 1).padStart(2, '0')}</span><strong>${escapeHtml(topic.name)}</strong><small>${escapeHtml(topic.definition)}</small></button>`).join('')}</div>
    </section>`;
  }).join('');
  document.querySelectorAll('[data-map-topic]').forEach(button => button.addEventListener('click', () => { location.hash = `topic/${button.dataset.mapTopic}`; }));
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
  inspector.classList.add('open');
  inspector.querySelector('.inspector-close').addEventListener('click', () => inspector.classList.remove('open'));
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
  const article = document.querySelector('#chapter-article');
  const index = COURSE_CHAPTERS.findIndex(item => item.id === chapter.id);
  article.innerHTML = `<header class="chapter-header">
      <div class="chapter-kicker"><span>CH ${chapter.number}</span>${escapeHtml(chapter.tag)} · ${escapeHtml(chapter.duration)}</div>
      <h1>${escapeHtml(chapter.title)}</h1><p class="chapter-thesis">${escapeHtml(chapter.thesis)}</p>
    </header>
    <section class="objectives"><h2>完成本章后，你应该能够</h2><ul>${chapter.objectives.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
    <div class="diagram-shell"><span class="diagram-label">SYSTEM MODEL / 本章系统模型</span><div class="mermaid">${escapeHtml(chapter.diagram)}</div></div>
    ${chapter.sections.map((section, sectionIndex) => `<section class="chapter-section" id="${chapter.id}-section-${sectionIndex}"><h2><span>${String(sectionIndex + 1).padStart(2, '0')}</span>${escapeHtml(section.title)}</h2>${section.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}${section.callout ? `<div class="callout">${escapeHtml(section.callout)}</div>` : ''}${section.diagram ? `<div class="diagram-shell"><div class="mermaid">${escapeHtml(section.diagram)}</div></div>` : ''}${section.code ? `<pre><code>${escapeHtml(section.code)}</code></pre>` : ''}</section>`).join('')}
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
  filters.innerHTML = `<button class="filter-button ${activeDomain === 'all' ? 'active' : ''}" data-filter="all">全部 · ${KNOWLEDGE_TOPICS.length}</button>${TECH_DOMAINS.map(domain => `<button class="filter-button ${activeDomain === domain.id ? 'active' : ''}" data-filter="${domain.id}">${escapeHtml(shortDomainName(domain))} · ${KNOWLEDGE_TOPICS.filter(topic => topic.domain === domain.id).length}</button>`).join('')}`;
  filters.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { activeDomain = button.dataset.filter; renderGlossary(); }));
  const query = document.querySelector('#glossary-search').value.trim().toLowerCase();
  const topics = KNOWLEDGE_TOPICS.filter(topic => (activeDomain === 'all' || topic.domain === activeDomain) && (!query || Object.values(topic).flat().join(' ').toLowerCase().includes(query)));
  if (topics.length && !topics.some(topic => topic.id === activeTopic)) activeTopic = topics[0].id;
  document.querySelector('#glossary-index').innerHTML = topics.length ? topics.map(topic => {
    const domain = domainFor(topic);
    return `<button class="glossary-card ${topic.id === activeTopic ? 'active' : ''}" style="--topic-color:${domain.color}" data-glossary-topic="${topic.id}"><span>${escapeHtml(shortDomainName(domain))}</span><strong>${escapeHtml(topic.name)}</strong><small>${escapeHtml(topic.definition)}</small></button>`;
  }).join('') : '<div class="empty-result">没有匹配的概念。试试“状态”“检索”或“权限”。</div>';
  document.querySelectorAll('[data-glossary-topic]').forEach(button => button.addEventListener('click', () => { location.hash = `concept/${button.dataset.glossaryTopic}`; }));
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
  const article = document.querySelector('#project-article');
  article.innerHTML = `<header class="project-title-row"><div><p class="eyebrow">${escapeHtml(project.category)} / ARCHITECTURE</p><h1>${escapeHtml(project.name)}</h1><p>${escapeHtml(project.relations)}</p></div><span class="status-badge">${escapeHtml(project.status)}</span></header>
    <div class="project-positioning"><strong>项目定位：</strong>${escapeHtml(project.positioning)}</div>
    <section class="project-section"><h2>整体架构</h2><div class="diagram-shell"><div class="mermaid">${escapeHtml(project.architecture)}</div></div></section>
    <section class="project-section"><h2>模块级源码解读</h2><table class="module-table"><thead><tr><th>模块 / 路径</th><th>做什么</th><th>怎么实现</th><th>为什么这样设计</th></tr></thead><tbody>${project.modules.map(module => `<tr><td>${escapeHtml(module.name)}</td><td>${escapeHtml(module.what)}</td><td>${escapeHtml(module.how)}</td><td>${escapeHtml(module.why)}</td></tr>`).join('')}</tbody></table></section>
    <section class="project-section"><h2>一次请求如何流动</h2><ol class="flow-list">${project.flow.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol></section>
    <section class="project-section"><h2>关键设计决策</h2><ul class="decision-list">${project.decisions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
    <section class="project-section"><div class="risk-grid"><div class="risk-box"><h3>LIMITATIONS / 局限</h3><ul>${project.limits.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div class="risk-box improvement"><h3>NEXT / 优化方向</h3><ul>${project.improve.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></div></section>
    <section class="project-section"><h2>源码与官方资料</h2>${sourceLinks(project.sources)}</section>`;
  const related = (RELATION_LINKS[project.id] || []).map(id => PROJECT_BY_ID[id]).filter(Boolean);
  document.querySelector('#compare-panel').innerHTML = `<p class="eyebrow">RELATIONSHIP</p><h2>它与其他项目的关系</h2><div class="relation-card"><p>${escapeHtml(project.relations)}</p></div>${related.length ? `<div class="compare-links"><span class="eyebrow">继续对照阅读</span>${related.map(item => `<button data-related-project="${item.id}"><strong>${escapeHtml(item.name)}</strong><br />${escapeHtml(item.category)}</button>`).join('')}</div>` : ''}<div class="relation-card"><p><strong>推荐阅读顺序：</strong><br />先看定位与架构，再沿模块路径进入源码，最后用请求流程验证自己的理解。</p></div>`;
  document.querySelectorAll('[data-related-project]').forEach(button => button.addEventListener('click', () => { location.hash = `project/${button.dataset.relatedProject}`; }));
  renderMermaid(article);
}

function renderProjects() { renderProjectIndex(); renderProject(); }

function searchCorpus(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const topics = KNOWLEDGE_TOPICS.filter(item => JSON.stringify(item).toLowerCase().includes(q)).map(item => ({ kind: '概念', id: item.id, title: item.name, summary: item.definition, hash: `concept/${item.id}` }));
  const chapters = COURSE_CHAPTERS.filter(item => JSON.stringify(item).toLowerCase().includes(q)).map(item => ({ kind: '课程', id: item.id, title: `${item.number} · ${item.title}`, summary: item.thesis, hash: `chapter/${item.id}` }));
  const projects = PROJECT_CASES.filter(item => JSON.stringify(item).toLowerCase().includes(q)).map(item => ({ kind: '源码', id: item.id, title: item.name, summary: item.positioning, hash: `project/${item.id}` }));
  return [...topics, ...chapters, ...projects].slice(0, 40);
}

function openSearch(initial = '') {
  const layer = document.querySelector('#search-layer');
  layer.hidden = false;
  const input = document.querySelector('#global-search');
  input.value = initial;
  renderSearchResults();
  requestAnimationFrame(() => input.focus());
}

function closeSearch() { document.querySelector('#search-layer').hidden = true; }

function renderSearchResults() {
  const input = document.querySelector('#global-search');
  const results = searchCorpus(input.value);
  document.querySelector('#search-hint').textContent = input.value.trim() ? `找到 ${results.length} 条结果（最多显示 40 条）` : `输入关键词，检索 ${KNOWLEDGE_TOPICS.length} 个技术点、${COURSE_CHAPTERS.length} 章课程与 ${PROJECT_CASES.length} 个项目案例。`;
  document.querySelector('#search-results').innerHTML = results.map(result => `<button class="search-result" data-result-hash="${result.hash}"><span>${result.kind}</span><span><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(result.summary)}</small></span></button>`).join('');
  document.querySelectorAll('[data-result-hash]').forEach(button => button.addEventListener('click', () => { closeSearch(); location.hash = button.dataset.resultHash; }));
}

function route() {
  const [kind = 'map', id] = location.hash.replace(/^#/, '').split('/');
  if (kind === 'topic' && TOPIC_BY_ID[id]) { activeTopic = id; setView('map'); renderMap(); return; }
  if (kind === 'concept' && TOPIC_BY_ID[id]) { activeTopic = id; activeDomain = 'all'; setView('glossary'); renderGlossary(); return; }
  if (kind === 'chapter' && CHAPTER_BY_ID[id]) { activeChapter = id; setView('course'); renderCourse(); return; }
  if (kind === 'project' && PROJECT_BY_ID[id]) { activeProject = id; setView('projects'); renderProjects(); return; }
  if (['map', 'course', 'glossary', 'projects'].includes(kind)) { setView(kind); if (kind === 'map') renderMap(); if (kind === 'course') renderCourse(); if (kind === 'glossary') renderGlossary(); if (kind === 'projects') renderProjects(); return; }
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
  if (event.key === 'Escape') closeSearch();
});
window.addEventListener('hashchange', route);

route();
