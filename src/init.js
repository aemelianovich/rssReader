import 'bootstrap/dist/css/bootstrap.min.css';
import * as yup from 'yup';
import axios from 'axios';
import _ from 'lodash';
import i18n from 'i18next';
import createWatchedState from './view.js';
import resources from './locales';

const stateStatuses = {
  rssForm: {
    init: 'init',
    submitting: 'submitting',
    processed: 'processed',
    declined: 'declined',
  },
};

const state = {
  lng: 'en',
  rssForm: {
    processState: null,
    processMsg: null,
    data: {
      feeds: [],
      posts: [],
    },
  },
};

const pageElements = {
  title: document.querySelector('.jumbotron').querySelector('h1'),
  desc: document.querySelector('.jumbotron').querySelector('.description'),
  example: document.querySelector('.jumbotron').querySelector('.example'),
  rssForm: {
    form: document.querySelector('.rss-form'),
    fieldset: document.querySelector('.rss-form').querySelector('fieldset'),
    input: document.querySelector('.rss-form').querySelector('input'),
    submit: document.querySelector('.rss-form').querySelector('button'),
  },
  feedback: document.querySelector('.feedback'),
  feeds: document.querySelector('.feeds'),
  posts: document.querySelector('.posts'),
};

const validateRssForm = (url, addedUrls) => {
  yup.setLocale({
    string: {
      url: i18n.t('feedback.validUrl'),
    },
  });

  const urlSchema = yup.string().url().notOneOf(addedUrls, i18n.t('feedback.existsRss'));

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
  i18n.init({
    lng: state.lng,
    debug: true,
    resources,
  }).then(() => {
    console.log(i18n.t('title'));
    const watchedState = createWatchedState(state, stateStatuses, pageElements, i18n);
    watchedState.rssForm.processState = stateStatuses.rssForm.init;

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
            watchedState.rssForm.data.posts = [...watchedState.rssForm.data.posts,
              ...channel.posts];

            watchedState.rssForm.processMsg = i18n.t('feedback.addedRss');
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
  }).catch((err) => {
    // eslint-disable-next-line no-alert
    alert(err.message);
    throw err;
  });
};
