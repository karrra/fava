import URI from 'urijs';

import { $ } from './helpers';
import e from './events';
import initSort from './sort';

function loadURL(url, noHistoryState) {
  const getUrl = new URI(url)
    .setSearch('partial', true)
    .toString();

  fetch(getUrl)
    .then(response => response.text())
    .then((data) => {
      if (!noHistoryState) {
        window.history.pushState(null, null, url);
      }
      $('article').innerHTML = data;
      e.trigger('page-loaded');
    }, () => {
      e.trigger('error', `Loading ${url} failed.`);
    });
}

function updateURL(url) {
  const newURL = new URI(url);
  ['account', 'from', 'payee', 'tag', 'time'].forEach((filter) => {
    newURL.removeSearch(filter);
    const el = document.getElementById(`${filter}-filter`);
    if (el.value) {
      newURL.setSearch(filter, el.value);
    }
  });
  const interval = document.getElementById('chart-interval');
  if (interval) {
    newURL.setSearch('interval', interval.value);
    if (interval.value === interval.getAttribute('data-default')) {
      newURL.removeSearch('interval');
    }
  }
  return newURL.toString();
}

e.on('reload', () => {
  loadURL(window.location.href);
});

export default function initRouter() {
  window.addEventListener('popstate', () => {
    loadURL(window.location.href, true);
  });

  $.delegate(document, 'click', 'a', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    const link = event.target.closest('a');
    let href = link.getAttribute('href');

    const isHttp = link.protocol.indexOf('http') === 0;
    const format = (href.indexOf('.') > 0) ? href.slice(href.indexOf('.') + 1) : 'html';
    const isRemote = link.getAttribute('data-remote');

    if (!event.defaultPrevented && !isRemote && isHttp && format === 'html') {
      event.preventDefault();

      // update sidebar links
      if (link.parentNode.parentNode.parentNode.tagName === 'ASIDE') {
        href = updateURL(href);
      }
      loadURL(href);
    }
  });

  $('#reload-page').addEventListener('click', (event) => {
    event.preventDefault();
    e.trigger('reload');
  });

  $('#filter-form').addEventListener('submit', (event) => {
    event.preventDefault();
    loadURL(updateURL(window.location.href));
  });

  // These elements might be added asynchronously, so rebind them on page-load.
  e.on('page-loaded', () => {
    if ($('#query-form')) {
      $('#query-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const url = new URI(window.location.href)
          .setSearch('query_string', $('#query-editor').value);

        const pageURL = url.toString();

        const fetchURL = url
          .setSearch('partial', true)
          .setSearch('result_only', true)
          .toString();

        fetch(fetchURL)
          .then(response => response.text())
          .then((data) => {
            $('#query-container').innerHTML = data;
            initSort();
            window.history.replaceState(null, null, pageURL);
          });
      });
    }

    if ($('#chart-interval')) {
      $('#chart-interval').addEventListener('change', () => {
        loadURL(updateURL(window.location.href));
      });
    }
  });
}
