(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const sections = ['conversation', 'documents'];
  let timers = [];
  const stop = () => { timers.forEach(clearTimeout); timers = []; $('.demo-orbit').classList.remove('is-active'); $('#stop-conversation').hidden = true; $('#play-conversation').disabled = false; };
  const route = () => {
    stop();
    const active = location.hash === '#documents' ? 'documents' : 'conversation';
    sections.forEach(id => { $('#' + id).hidden = id !== active; });
    document.querySelectorAll('.demo-tabs a').forEach(a => a.getAttribute('href') === '#' + active ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    $('#conversation-title').textContent = 'What’s on your mind?';
  };
  const sample = () => {
    stop();
    const vi = $('#answer-language').value === 'vi';
    const states = vi ? [
      ['Đang nghe…', 'Ví dụ: “Tôi có thể hỏi về thuốc và báo cáo bệnh viện cùng lúc không?”'],
      ['Đang suy nghĩ…', 'Đây là phần mô phỏng giao diện, không phải xử lý thông tin sức khỏe.'],
      ['Đang nói…', 'Bạn chọn những tài liệu muốn đưa vào câu hỏi. Đây chỉ là ví dụ giao diện, không phải lời khuyên y tế.'],
    ] : [
      ['Listening…', 'Sample question: “Can I ask about my medicine and hospital report together?”'],
      ['Thinking…', 'Showing the processing state. No health information is being analysed.'],
      ['Speaking…', 'You choose which documents to include in your question. This is an interface sample, not a medical answer.'],
    ];
    $('#play-conversation').disabled = true; $('#stop-conversation').hidden = false; $('.demo-orbit').classList.add('is-active');
    const show = i => { $('#conversation-title').textContent = states[i][0]; $('.demo-transcript').textContent = states[i][1]; };
    show(0);
    timers.push(setTimeout(() => show(1), 1800), setTimeout(() => show(2), 3400), setTimeout(() => { stop(); $('#conversation-title').textContent = 'Preview complete'; }, 6500));
  };
  $('#play-conversation').addEventListener('click', sample);
  $('#stop-conversation').addEventListener('click', () => { stop(); $('#conversation-title').textContent = 'Preview stopped'; });
  const selected = () => [...document.querySelectorAll('input[name="document"]:checked')].map(x => x.value);
  document.querySelectorAll('input[name="document"]').forEach(input => input.addEventListener('change', () => {
    const n = selected().length; $('#document-count').textContent = `${n} sample ${n === 1 ? 'item' : 'items'} selected`; $('#ask-documents').disabled = n === 0;
  }));
  $('#ask-documents').addEventListener('click', () => {
    if (!selected().length) return;
    location.hash = 'conversation';
    $('.demo-transcript').textContent = `Included in this sample question: ${selected().join(', ')}. These are illustrative items, not your health records.`;
  });
  $('#voice-language').addEventListener('change', () => { $('#language-note').textContent = `Proposed spoken language: ${$('#voice-language').selectedOptions[0].textContent}. No speech is generated in this preview.`; });
  $('#answer-language').addEventListener('change', () => { stop(); $('#conversation-title').textContent = 'What’s on your mind?'; });
  addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); $('#conversation-title').textContent = 'Preview paused'; } });
  route();
})();
