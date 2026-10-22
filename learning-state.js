/* Pure helpers for data migration and backup validation. */
const LearningState = (() => {
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  function read(storage, key, fallback = {}) {
    try { const value = JSON.parse(storage.getItem(key)); return object(value) ? value : fallback; }
    catch { return fallback; }
  }
  function validateBackup(value, chapterIds, labIds) {
    if (!object(value) || value.version !== 1 || !object(value.chapters) || !object(value.labs) || !object(value.quizzes) || !object(value.notes) || !object(value.bookmarks)) throw new Error('请选择 Agent Systems 导出的版本 1 学习记录。');
    const clean = { version: 1, chapters: {}, labs: {}, quizzes: {}, notes: {}, bookmarks: {} };
    for (const [key, done] of Object.entries(value.chapters)) if (chapterIds.includes(key) && typeof done === 'boolean') clean.chapters[key] = done;
    for (const [key, done] of Object.entries(value.labs)) if (labIds.includes(key) && typeof done === 'boolean') clean.labs[key] = done;
    for (const [key, answers] of Object.entries(value.quizzes)) if (chapterIds.includes(key) && object(answers)) {
      clean.quizzes[key] = Object.fromEntries(Object.entries(answers).filter(([index, answer]) => /^\d{1,3}$/.test(index) && Number.isInteger(answer) && answer >= 0 && answer < 10));
    }
    for (const [key, text] of Object.entries(value.notes)) if (chapterIds.includes(key) && typeof text === 'string' && text.length <= 20000) clean.notes[key] = text;
    for (const [key, saved] of Object.entries(value.bookmarks)) if (/^(chapter|project|concept|lab)\/[a-z0-9-]+$/.test(key) && saved === true) clean.bookmarks[key] = true;
    return clean;
  }
  function quizStats(chapters, answers) {
    let answered = 0, correct = 0;
    const mistakes = [];
    for (const [chapterId, questions] of Object.entries(chapters)) questions.forEach((question, index) => {
      const answer = answers[chapterId]?.[index];
      if (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length) return;
      answered++;
      if (answer === question.answer) correct++; else mistakes.push({ chapterId, index, question, answer });
    });
    return { answered, correct, mistakes };
  }
  return { read, validateBackup, quizStats };
})();
if (typeof module !== 'undefined') module.exports = LearningState;
