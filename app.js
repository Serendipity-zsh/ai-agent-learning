const nav = document.querySelector('#module-nav');
const lessonNav = document.querySelector('#lesson-nav');
const detail = document.querySelector('#module-detail');
const search = document.querySelector('#lesson-search');
const progressLabel = document.querySelector('#progress-label');
const saved = JSON.parse(localStorage.getItem('agent-field-notes-progress') || '{}');
let activeModule = COURSE_MODULES[0].id;
let activeLesson = COURSE_MODULES[0].lessons[0].id;

const allLessons = () => COURSE_MODULES.flatMap(module => module.lessons.map(lesson => ({ ...lesson, module })));
const totalLessons = allLessons().length;
document.querySelector('#module-count').textContent = String(COURSE_MODULES.length).padStart(2, '0');
document.querySelector('#lesson-count').textContent = String(totalLessons).padStart(2, '0');

function updateProgress() {
  const complete = allLessons().filter(lesson => saved[lesson.id]).length;
  progressLabel.textContent = `${complete} / ${totalLessons} 已完成`;
}

function renderModules() {
  nav.innerHTML = COURSE_MODULES.map(module => {
    const count = module.lessons.filter(lesson => saved[lesson.id]).length;
    return `<button class="module-tab ${module.id === activeModule ? 'active' : ''}" data-id="${module.id}"><span>${module.label}</span><strong>${module.title}</strong><small>${module.time} · ${count}/${module.lessons.length}</small></button>`;
  }).join('');
  nav.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    activeModule = button.dataset.id;
    const module = COURSE_MODULES.find(item => item.id === activeModule);
    activeLesson = module.lessons[0].id;
    renderModules(); renderLessons(); renderDetail();
  }));
}

function renderLessons() {
  const module = COURSE_MODULES.find(item => item.id === activeModule);
  const query = search.value.trim().toLowerCase();
  const matches = allLessons().filter(lesson => !query || [lesson.title, lesson.why, ...lesson.learn, lesson.practice, lesson.read].join(' ').toLowerCase().includes(query));
  const visible = query ? matches : module.lessons.map(lesson => ({ ...lesson, module }));
  if (visible.length && !visible.some(lesson => lesson.id === activeLesson)) activeLesson = visible[0].id;
  const heading = query ? `搜索结果 · ${matches.length} 课` : module.title;
  lessonNav.innerHTML = `<div class="lesson-nav-head"><span>${query ? '全课程搜索' : '当前阶段'}</span><strong>${heading}</strong></div>${visible.length ? visible.map((lesson, index) => `<button class="lesson-tab ${lesson.id === activeLesson ? 'active' : ''}" data-id="${lesson.id}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${lesson.title}</strong><small>${query ? `${lesson.module.title} · ` : ''}${lesson.level} ${saved[lesson.id] ? '· 已完成' : ''}</small></button>`).join('') : '<p class="empty-search">没有匹配的课次。换个关键词试试。</p>'}`;
  lessonNav.querySelectorAll('button').forEach(button => button.addEventListener('click', () => { activeLesson = button.dataset.id; const selected = allLessons().find(lesson => lesson.id === activeLesson); activeModule = selected.module.id; renderModules(); renderLessons(); renderDetail(); }));
}

function renderDetail() {
  const found = allLessons().find(lesson => lesson.id === activeLesson);
  if (!found) return;
  const { module, ...lesson } = found;
  const done = Boolean(saved[lesson.id]);
  const links = (lesson.links || []).map(link => `<a href="${link.url}" target="_blank" rel="noreferrer">${link.text} ↗</a>`).join('');
  const position = allLessons().findIndex(item => item.id === lesson.id);
  const previous = allLessons()[position - 1];
  const next = allLessons()[position + 1];
  detail.innerHTML = `<div class="detail-top"><span class="phase-dot ${module.color}"></span><div><p class="kicker">${module.label} / ${module.title} / ${lesson.level}</p><h3>${lesson.title}</h3></div><label class="complete-toggle"><input type="checkbox" ${done ? 'checked' : ''} data-complete="${lesson.id}" /><span>${done ? '已完成' : '标记完成'}</span></label></div><p class="stage-context">${module.description}</p><p class="detail-why"><span>为什么学</span>${lesson.why}</p><div class="lesson-content"><section><h4>你要掌握</h4><ul>${lesson.learn.map(item => `<li>${item}</li>`).join('')}</ul></section><section><h4>动手实验</h4><p>${lesson.practice}</p><h4>验收标准</h4><p>${lesson.acceptance}</p></section></div><div class="detail-foot"><span>源码 / 延伸</span><strong>${lesson.read}${links ? `<br />${links}` : ''}</strong></div><div class="lesson-pager"><button data-jump="${previous ? previous.id : ''}" ${previous ? '' : 'disabled'}>← 上一课</button><span>${position + 1} / ${totalLessons}</span><button data-jump="${next ? next.id : ''}" ${next ? '' : 'disabled'}>下一课 →</button></div>`;
  detail.querySelector('input').addEventListener('change', event => {
    saved[lesson.id] = event.target.checked;
    localStorage.setItem('agent-field-notes-progress', JSON.stringify(saved));
    updateProgress(); renderModules(); renderLessons(); renderDetail();
  });
  detail.querySelectorAll('.lesson-pager button').forEach(button => button.addEventListener('click', () => {
    if (!button.dataset.jump) return;
    activeLesson = button.dataset.jump;
    activeModule = allLessons().find(item => item.id === activeLesson).module.id;
    renderModules(); renderLessons(); renderDetail();
    detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

function renderSources() {
  document.querySelector('#source-grid').innerHTML = SOURCE_GUIDE.map((source, index) => `<a class="source-card" href="${source.url}" target="_blank" rel="noreferrer"><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${source.name} ↗</h3><p>${source.focus}</p></div></a>`).join('');
}

search.addEventListener('input', () => { renderLessons(); renderDetail(); });
renderModules(); renderLessons(); renderDetail(); renderSources(); updateProgress();
