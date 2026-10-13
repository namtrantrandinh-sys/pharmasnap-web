(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const {locales, samples} = window.PharmaSnapSamples;
  const sections = Object.keys(samples);
  const audio = $('#sample-audio');
  let active = 'conversation';
  let playing = false;
  let playRequest = 0;
  const shown = new Set();
  const answerLanguage = () => $('#answer-language').value;
  const voiceLanguage = () => $('#voice-language').value;
  const copy = () => locales[answerLanguage()];
  const selected = () => [...document.querySelectorAll('input[name="document"]:checked')].map(input => input.value);

  function stop() {
    ++playRequest; // Ignore an old play promise after a route/language change.
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
    if (language) element.lang = locales[language].tag;
    return element;
  }

  function renderAnswer(mode) {
    const language = answerLanguage();
    const spokenLanguage = voiceLanguage();
    const sample = samples[mode][language];
    const container = $('#' + mode + '-answer');
    container.replaceChildren();
    container.lang = copy().tag;
    container.hidden = false;
    container.append(textElement('p', 'demo-question', `${copy().question}: “${sample.question}”`));
    if (mode === 'documents') {
      container.append(textElement('p', 'demo-note', `${copy().included}: ${selected().map(key => copy().documents[key]).join(', ')}.`));
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
    $('#document-count').textContent = copy().count(count);
    $('#document-count').lang = copy().tag;
    $('#ask-documents').disabled = count === 0;
  }

  function updateLanguage() {
    stop();
    $('#playback-status').textContent = '';
    $('#playback-status').lang = copy().tag;
    $('#conversation-title').textContent = shown.has('conversation') ? copy().ready : copy().idle;
    $('#conversation-title').lang = copy().tag;
    $('#language-note').textContent = copy().hint;
    $('#language-note').lang = copy().tag;
    document.querySelectorAll('[data-document]').forEach(element => {
      element.textContent = copy().documents[element.dataset.document];
      element.lang = copy().tag;
    });
    $('#pack-a-title').textContent = copy().packA;
    $('#pack-b-title').textContent = copy().packB;
    document.querySelectorAll('.active-label').forEach(element => {
      element.textContent = copy().active;
      element.lang = copy().tag;
    });
    $('#ingredient-match').textContent = copy().same;
    $('#ingredient-match').lang = copy().tag;
    updateDocuments();
    shown.forEach(renderAnswer);
    if (!shown.has('conversation')) {
      $('#conversation-answer').lang = copy().tag;
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
        // Compare the actual names on these fixed labels, rather than a timed animation.
        const name = element.dataset.ingredient;
        const matches = [...document.querySelectorAll('[data-ingredient]')].filter(other => other.dataset.ingredient === name);
        element.replaceChildren(textElement(matches.length > 1 ? 'mark' : 'span', '', name));
      });
      $('#ingredient-match').hidden = false;
    }
    $('#conversation-title').textContent = copy().ready;
    const request = playRequest;
    audio.src = `/audio/${mode}-${voiceLanguage()}.m4a`;
    playing = true;
    $('#stop-conversation').hidden = false;
    try {
      await audio.play(); // Runs directly from the click, including on mobile Safari.
      if (request !== playRequest) return;
    } catch (error) {
      if (request !== playRequest) return;
      stop();
      $('#playback-status').textContent = copy().failed;
      $('#playback-status').lang = copy().tag;
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

  $('#play-conversation').addEventListener('click', () => play('conversation'));
  $('#ask-documents').addEventListener('click', () => play('documents'));
  $('#check-ingredients').addEventListener('click', () => play('ingredients'));
  $('#stop-conversation').addEventListener('click', () => {
    stop();
    $('#playback-status').textContent = copy().stopped;
    $('#playback-status').lang = copy().tag;
  });
  $('#answer-language').addEventListener('change', updateLanguage);
  $('#voice-language').addEventListener('change', updateLanguage);
  document.querySelectorAll('input[name="document"]').forEach(input => input.addEventListener('change', () => {
    stop();
    $('#playback-status').textContent = '';
    updateDocuments();
    // A changed selection needs a fresh click; never leave an answer about old items.
    shown.delete('documents');
    $('#documents-answer').hidden = true;
  }));
  audio.addEventListener('playing', () => {
    if (!playing) return;
    $('#playback-status').textContent = locales[voiceLanguage()].playing;
    $('#playback-status').lang = locales[voiceLanguage()].tag;
    if (active === 'conversation') $('.demo-orbit').classList.add('is-active');
  });
  audio.addEventListener('ended', () => {
    if (!playing) return;
    stop();
    $('#playback-status').textContent = copy().complete;
    $('#playback-status').lang = copy().tag;
  });
  audio.addEventListener('error', () => {
    if (!playing) return;
    stop();
    $('#playback-status').textContent = copy().failed;
    $('#playback-status').lang = copy().tag;
  });
  addEventListener('hashchange', route);
  addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
      $('#playback-status').textContent = copy().stopped;
      $('#playback-status').lang = copy().tag;
    }
  });
  updateLanguage();
  route();
})();
