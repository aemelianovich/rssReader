import 'bootstrap/dist/css/bootstrap.min.css';
import * as yup from 'yup';
import axios from 'axios';
import _ from 'lodash';
import createWatchedState from './view.js';

const stateStatuses = {
  rssForm: {
    ready: 'ready',
    submitting: 'submitting',
    processed: 'processed',
    declined: 'declined',
  },
};

const state = {
  rssForm: {
    processState: stateStatuses.rssForm.ready,
    processMsg: null,
    data: {
      feeds: [],
      posts: [],
    },
  },
};

const pageElements = {
  rssForm: {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('.rss-form').querySelector('input'),
    fieldset: document.querySelector('.rss-form').querySelector('fieldset'),
  },
  feedback: document.querySelector('.feedback'),
  feeds: document.querySelector('.feeds'),
  posts: document.querySelector('.posts'),
};

const validateRssForm = (url, addedUrls) => {
  yup.setLocale({
    string: {
      url: 'Must be valid url',
    },
  });

  const urlSchema = yup.string().url().notOneOf(addedUrls, 'Rss has been loaded');

  try {
    urlSchema.validateSync(url);
    return null;
  } catch (err) {
    return err.message;
  }
};

const parseRss = (rssStr) => {
  const rssDocument = new DOMParser().parseFromString(rssStr, 'text/xml');
  const errorEl = rssDocument.querySelector('parsererror');
  if (errorEl !== null) {
    throw new Error(errorEl.textContent);
  }

  // const spans = ul.querySelectorAll('.odd > span');
  const feedId = _.uniqueId();
  const channel = {
    feed: {
      id: feedId,
      title: rssDocument.querySelector('channel > title').textContent,
      desc: rssDocument.querySelector('channel > description').textContent,
    },
    posts: [],
  };

  const postElements = rssDocument.querySelectorAll('channel > item');

  postElements.forEach((postEl) => {
    const post = {
      feedId,
      id: _.uniqueId(),
      title: postEl.querySelector('title').textContent,
      link: postEl.querySelector('link').textContent,
      desc: postEl.querySelector('description').textContent,
    };

    channel.posts.push(post);
  });

  return channel;
};

export default () => {
  const watchedState = createWatchedState(state, stateStatuses, pageElements);

  pageElements.rssForm.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const rssForm = new FormData(e.target);
    watchedState.rssForm.processState = stateStatuses.rssForm.submitting;

    const url = rssForm.get('url');
    const addedRssUrls = watchedState.rssForm.data.feeds
      .map(({ rssUrl }) => (rssUrl || null));

    const errMsg = validateRssForm(url, addedRssUrls);

    if (errMsg === null) {
      axios({
        method: 'get',
        url: '/get',
        params: {
          url: `${url}`,
        },
        baseURL: 'https://api.allorigins.win/',
      }).then((response) => {
        console.log(response);
        try {
          const channel = parseRss(response.data.contents);
          channel.feed.rssUrl = response.config.params.url;

          watchedState.rssForm.data.feeds.push(channel.feed);
          watchedState.rssForm.data.posts = [...watchedState.rssForm.data.posts, ...channel.posts];

          watchedState.rssForm.processMsg = 'Rss was added';
          watchedState.rssForm.processState = stateStatuses.rssForm.processed;
        } catch (err) {
          watchedState.rssForm.processMsg = err.message;
          watchedState.rssForm.processState = stateStatuses.rssForm.declined;
        }
      }).catch((err) => {
        console.log(err);
        watchedState.rssForm.processMsg = err.message;
        watchedState.rssForm.processState = stateStatuses.rssForm.declined;
      });
    } else {
      watchedState.rssForm.processMsg = errMsg;
      watchedState.rssForm.processState = stateStatuses.rssForm.declined;
    }
  });
};
