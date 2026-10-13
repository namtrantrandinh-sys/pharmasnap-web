(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const {locales, samples} = window.PharmaSnapSamples;
  const sections = Object.keys(samples);
  const audio = $('#sample-audio');
  let active = 'conversation';
  let playing = false;
  let playRequest = 0;
  let stockProduct = null;
  const shown = new Set();
  const answerLanguage = () => $('#answer-language').value;
  const voiceLanguage = () => $('#voice-language').value;
  const copy = () => locales[answerLanguage()];
  const selected = () => [...document.querySelectorAll('input[name="document"]:checked')].map(input => input.value);
  // Fictional walkthrough data. Never presented as actual nearby pharmacies.
  const stockExamples = {
    paracetamol: {name: 'Paracetamol 500 mg tablets', states: ['confirmed', 'listed', 'unknown']},
    vitamin: {name: 'Vitamin D3 1000 IU capsules', states: ['listed', 'out', 'unknown']}
  };
  const stockLabels = {
    en: ['Confirmed in stock · example', 'Listed by pharmacy · example', 'Out of stock · example', 'Availability unknown · example'],
    vi: ['Đã xác nhận còn hàng · ví dụ', 'Nhà thuốc có thông tin sản phẩm · ví dụ', 'Hết hàng · ví dụ', 'Chưa rõ tình trạng hàng · ví dụ'],
    zh: ['已确认有货 · 示例', '药房列有此产品 · 示例', '缺货 · 示例', '供货情况未知 · 示例'],
    ar: ['متوفر ومؤكد · مثال', 'مدرج لدى الصيدلية · مثال', 'نفد المخزون · مثال', 'التوفر غير معروف · مثال'],
    hi: ['स्टॉक की पुष्टि हुई · उदाहरण', 'फ़ार्मेसी की सूची में है · उदाहरण', 'स्टॉक खत्म · उदाहरण', 'उपलब्धता अज्ञात · उदाहरण'],
    el: ['Επιβεβαιωμένο απόθεμα · παράδειγμα', 'Αναφέρεται από το φαρμακείο · παράδειγμα', 'Εξαντλήθηκε · παράδειγμα', 'Άγνωστη διαθεσιμότητα · παράδειγμα'],
    it: ['Disponibilità confermata · esempio', 'Presente sul sito della farmacia · esempio', 'Esaurito · esempio', 'Disponibilità sconosciuta · esempio'],
    fil: ['Kumpirmadong may stock · halimbawa', 'Nakalista sa botika · halimbawa', 'Ubos ang stock · halimbawa', 'Hindi alam ang availability · halimbawa'],
    ne: ['स्टक पुष्टि भएको · नमुना', 'फार्मेसीको सूचीमा छ · नमुना', 'स्टक सकिएको · नमुना', 'उपलब्धता अज्ञात · नमुना'],
    ko: ['재고 확인됨 · 예시', '약국에 등록된 제품 · 예시', '품절 · 예시', '재고 정보 없음 · 예시'],
    es: ['Stock confirmado · ejemplo', 'Listado por la farmacia · ejemplo', 'Agotado · ejemplo', 'Disponibilidad desconocida · ejemplo']
  };

  function stop() {
    ++playRequest;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    playing = false;
    $('.demo-orbit').classList.remove('is-active');
    $('#stop-conversation').hidden = true;
  }

  function textElement(tag, className, text, language) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    if (language) { element.lang = locales[language].tag; element.dir = locales[language].direction; }
    return element;
  }

  function renderStock() {
    const container = $('#stock-results');
    container.replaceChildren();
    if (!stockProduct) { container.hidden = true; return; }
    container.hidden = false;
    const example = stockExamples[stockProduct];
    container.append(textElement('p', 'demo-note', `${example.name} · FICTIONAL PHARMACY RESULTS`, 'en'));
    const stateOrder = ['confirmed', 'listed', 'out', 'unknown'];
    example.states.forEach((state,index) => {
      const card = textElement('article', 'demo-stock-card', '');
      card.dataset.stockState = state;
      card.append(textElement('h3', '', `Example pharmacy ${['A','B','C'][index]} · ${['0.6','1.2','2.1'][index]} km (example)`, 'en'));
      card.append(textElement('p', 'demo-stock-status', stockLabels[answerLanguage()][stateOrder.indexOf(state)], answerLanguage()));
      card.append(textElement('p', 'demo-note', 'Illustrative result only. No live pharmacy, location or inventory has been checked.', 'en'));
      container.append(card);
    });
  }

  function renderAnswer(mode) {
    const language = answerLanguage();
    const spokenLanguage = voiceLanguage();
    const sample = samples[mode][language];
    const container = $('#' + mode + '-answer');
    container.replaceChildren();
    container.lang = copy().tag;
    container.dir = copy().direction;
    container.hidden = false;
    container.append(textElement('p', 'demo-question', `${copy().question}: “${sample.question}”`));
    if (mode === 'documents') {
      container.append(textElement('p', 'demo-note', `${copy().included}: ${selected().map(key => copy().documents[key]).join(', ')}.`));
    }
    if (mode === 'ingredients') {
      container.append(textElement('p', 'demo-question', copy().findingsTitle));
      const findings = textElement('ul', 'demo-findings', '');
      copy().findings.forEach(finding => findings.append(textElement('li', '', finding)));
      container.append(findings, textElement('p', 'demo-note', copy().ingredientCaution));
    }
    container.append(textElement('p', 'demo-response', sample.response, language));
    if (spokenLanguage !== language) {
      const spoken = textElement('div', 'demo-spoken', '');
      spoken.append(textElement('p', 'demo-spoken-label', `${copy().spoken} · ${locales[spokenLanguage].name}`));
      spoken.append(textElement('p', 'demo-spoken-text', samples[mode][spokenLanguage].response, spokenLanguage));
      container.append(spoken);
    }
  }

  function updateDocuments() {
    const count = selected().length;
    $('#document-count').textContent = `${copy().included}: ${count}`;
    $('#document-count').lang = copy().tag;
    $('#ask-documents').disabled = count === 0;
  }

  function updateLanguage() {
    stop();
    $('#playback-status').textContent = '';
    $('#playback-status').lang = copy().tag;
    $('#playback-status').dir = copy().direction;
    $('#conversation-title').textContent = shown.has('conversation') ? copy().ready : copy().idle;
    $('#conversation-title').lang = copy().tag;
    $('#conversation-title').dir = copy().direction;
    document.querySelectorAll('[data-document]').forEach(element => {
      element.textContent = copy().documents[element.dataset.document];
      element.lang = copy().tag;
      element.dir = copy().direction;
    });
    updateDocuments();
    shown.forEach(renderAnswer);
    renderStock();
    if (!shown.has('conversation')) {
      $('#conversation-answer').lang = copy().tag;
      $('#conversation-answer').dir = copy().direction;
      $('#conversation-answer').textContent = samples.conversation[answerLanguage()].question;
    }
  }

  async function play(mode) {
    stop();
    if (mode === 'documents' && !selected().length) return;
    shown.add(mode);
    renderAnswer(mode);
    if (mode === 'ingredients') {
      document.querySelectorAll('[data-ingredient]').forEach(element => {
        const printedName = element.textContent;
        if (!element.querySelector('mark')) element.replaceChildren(textElement('mark', '', printedName));
      });
    }
    $('#conversation-title').textContent = copy().ready;
    const request = playRequest;
    audio.src = `/audio/${mode}-${voiceLanguage()}.mp3`;
    playing = true;
    $('#stop-conversation').hidden = false;
    try {
      await audio.play();
      if (request !== playRequest) return;
    } catch (error) {
      if (request !== playRequest) return;
      stop();
      $('#playback-status').textContent = copy().failed;
      $('#playback-status').lang = copy().tag;
      $('#playback-status').dir = copy().direction;
    }
  }

  function route() {
    stop();
    const requested = location.hash.slice(1);
    active = sections.includes(requested) ? requested : 'conversation';
    sections.forEach(id => { $('#' + id).hidden = id !== active; });
    document.querySelectorAll('.demo-tabs a').forEach(link => {
      if (link.hash === '#' + active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    $('#playback-status').textContent = '';
  }

  function showStock(key) {
    stockProduct = key;
    $('#stock-message').textContent = 'Sample nearby results are ready. These are fictional pharmacies and availability.';
    renderStock();
    play('pharmacies');
  }
  function resetStock() {
    stop();
    stockProduct = null;
    shown.delete('pharmacies');
    renderStock();
    $('#pharmacies-answer').hidden = true;
    $('#stock-photo').hidden = true;
    $('#stock-message').textContent = '';
  }
  $('#stock-sample-form').addEventListener('submit', event => {
    event.preventDefault();
    resetStock();
    const name = $('#stock-product').value.trim().toLowerCase().replace(/\s+/g, ' ');
    if (['paracetamol', 'paracetamol 500 mg', 'paracetamol 500 mg tablets'].includes(name)) showStock('paracetamol');
    else if (['vitamin d', 'vitamin d3', 'vitamin d3 1000 iu', 'vitamin d3 1000 iu capsules'].includes(name)) showStock('vitamin');
    else $('#stock-message').textContent = 'This walkthrough has two prepared examples: paracetamol and vitamin D. No live stock search was made for your entry.';
  });
  $('#stock-product').addEventListener('input', resetStock);
  $('#stock-photo-button').addEventListener('click', () => {
    $('#stock-photo').hidden = false;
    $('#stock-product').value = 'Vitamin D3 1000 IU capsules';
    showStock('vitamin');
  });
  $('#brand-lookup').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('#brand-query');
    const query = input.value.trim().replace(/\s+/g, ' ');
    input.setCustomValidity(query ? '' : 'Enter the brand and exact product name.');
    if (!input.reportValidity()) return;
    const url = new URL('https://www.google.com/search');
    url.searchParams.set('q', `${query} official manufacturer ingredients allergens gluten vegan`);
    $('#brand-result').href = url.href;
    $('#brand-result').hidden = false;
  });
  $('#brand-query').addEventListener('input', () => { $('#brand-query').setCustomValidity(''); $('#brand-result').hidden = true; });
  $('#play-conversation').addEventListener('click', () => play('conversation'));
  $('#ask-documents').addEventListener('click', () => play('documents'));
  $('#check-ingredients').addEventListener('click', () => play('ingredients'));
  $('#stop-conversation').addEventListener('click', () => {
    stop();
    $('#playback-status').textContent = copy().stopped;
    $('#playback-status').lang = copy().tag;
    $('#playback-status').dir = copy().direction;
  });
  $('#answer-language').addEventListener('change', updateLanguage);
  $('#voice-language').addEventListener('change', updateLanguage);
  document.querySelectorAll('input[name="document"]').forEach(input => input.addEventListener('change', () => {
    stop();
    $('#playback-status').textContent = '';
    updateDocuments();
    shown.delete('documents');
    $('#documents-answer').hidden = true;
  }));
  audio.addEventListener('playing', () => {
    if (!playing) return;
    $('#playback-status').textContent = locales[voiceLanguage()].playing;
    $('#playback-status').lang = locales[voiceLanguage()].tag;
    $('#playback-status').dir = locales[voiceLanguage()].direction;
    if (active === 'conversation') $('.demo-orbit').classList.add('is-active');
  });
  audio.addEventListener('ended', () => {
    if (!playing) return;
    stop();
    $('#playback-status').textContent = copy().complete;
    $('#playback-status').lang = copy().tag;
    $('#playback-status').dir = copy().direction;
  });
  audio.addEventListener('error', () => {
    if (!playing) return;
    stop();
    $('#playback-status').textContent = copy().failed;
    $('#playback-status').lang = copy().tag;
    $('#playback-status').dir = copy().direction;
  });
  addEventListener('hashchange', route);
  addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
      $('#playback-status').textContent = copy().stopped;
      $('#playback-status').lang = copy().tag;
      $('#playback-status').dir = copy().direction;
    }
  });
  updateLanguage();
  route();
})();
