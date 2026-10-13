(() => {
  'use strict';
  const form = document.querySelector('#pharmacy-search');
  const productInput = document.querySelector('#pharmacy-product');
  const placeInput = document.querySelector('#pharmacy-place');
  const results = document.querySelector('#pharmacy-results');
  const tidy = value => value.trim().replace(/\s+/g, ' ');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const product = tidy(productInput.value);
    const place = tidy(placeInput.value);
    productInput.setCustomValidity(product ? '' : 'Enter a product or medicine name.');
    placeInput.setCustomValidity(place ? '' : 'Enter an Australian suburb or postcode.');
    if (!form.reportValidity()) return;
    const maps = new URL('https://www.google.com/maps/search/');
    maps.searchParams.set('api', '1');
    maps.searchParams.set('query', `pharmacies near ${place}, Australia`);
    const listings = new URL('https://www.google.com/search');
    listings.searchParams.set('q', `${product} pharmacy ${place} Australia`);
    document.querySelector('#pharmacy-maps').href = maps.href;
    document.querySelector('#pharmacy-products').href = listings.href;
    document.querySelector('#pharmacy-summary').textContent = `Looking for ${product} near ${place}. Find nearby pharmacies or search product listings, then contact the pharmacy to confirm stock.`;
    results.hidden = false;
  });
  for (const input of [productInput, placeInput]) {
    input.addEventListener('input', () => {
      input.setCustomValidity('');
      results.hidden = true; // Never leave links pointing at an earlier product or suburb.
    });
  }
})();
