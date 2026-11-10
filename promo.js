// Hero promo film. The illustration stays on screen until someone presses
// play; only then is the MP4 (and its poster) requested. Without JavaScript,
// or without <dialog> support, the play link simply opens the MP4 itself.
(() => {
  const trigger = document.querySelector('[data-promo-open]');
  const dialog = document.getElementById('promo');
  if (!trigger || !dialog || typeof dialog.showModal !== 'function') return;
  const video = dialog.querySelector('video');
  const endCard = dialog.querySelector('.promo-end');
  const replay = dialog.querySelector('[data-promo-replay]');
  const closeButton = dialog.querySelector('.promo-close');

  const play = () => {
    endCard.hidden = true;
    if (video.ended) video.currentTime = 0;
    const attempt = video.play();
    // A refused autoplay leaves the native controls showing; nothing else to do.
    if (attempt && attempt.catch) attempt.catch(() => {});
  };

  trigger.addEventListener('click', event => {
    event.preventDefault();
    if (!video.getAttribute('src')) {
      video.poster = video.dataset.poster;
      video.src = video.dataset.src;
    }
    dialog.showModal();
    play();
  });

  dialog.addEventListener('close', () => {
    video.pause();
    trigger.focus({preventScroll: true});
  });
  closeButton.addEventListener('click', () => dialog.close());
  // A click on the dark backdrop (the dialog itself, not the film) closes it.
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  video.addEventListener('ended', () => {
    endCard.hidden = false;
    replay.focus();
  });
  replay.addEventListener('click', () => {
    video.currentTime = 0;
    play();
  });
})();
