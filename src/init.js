import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import * as yup from 'yup';
import axios from 'axios';
import _ from 'lodash';
import i18n from 'i18next';
import createWatchedState from './view.js';
import resources from './locales';
import { stateStatuses, refreshTimeout } from './constants.js';

const validateRssForm = (url, feeds) => {
  yup.setLocale({
    string: {
      url: i18n.t('feedback.invalidUrl'),
    },
  });

  const addedUrls = feeds.map(({ rssUrl }) => (rssUrl));

  const urlSchema = yup.string().url().notOneOf(addedUrls, i18n.t('feedback.existsRss'));

  try {
    urlSchema.validateSync(url);
    return null;
  } catch (err) {
    return err.message;
  }
};

const parseRss = (rssData) => {
  const rssDocument = new DOMParser().parseFromString(rssData, 'text/xml');
  const errorEl = rssDocument.querySelector('parsererror');
  if (errorEl !== null) {
    throw new Error(errorEl.textContent);
  }

  const postElements = [...rssDocument.querySelectorAll('channel > item')];

  const channel = {
    title: rssDocument.querySelector('channel > title').textContent,
    description: rssDocument.querySelector('channel > description').textContent,
    posts: postElements.map((postEl) => {
      const post = {
        title: postEl.querySelector('title').textContent,
        link: postEl.querySelector('link').textContent,
        description: postEl.querySelector('description').textContent,
      };
      return post;
    }),
  };

  return channel;
};

const loadFeed = (url, watchedState) => axios({
  method: 'get',
  url: '/get',
  params: {
    url: `${url}`,
  },
  baseURL: 'https://api.allorigins.win/',
})
  .then((response) => {
    const channel = parseRss(response.data.contents);

    const feed = {
      id: _.uniqueId(),
      rssUrl: response.config.params.url,
      title: channel.title,
      desc: channel.description,
    };

    const posts = channel.posts
      .map((post) => ({
        feedId: feed.id,
        id: _.uniqueId(),
        title: post.title,
        link: post.link,
        desc: post.description,
      }))
      .reverse();

    watchedState.data.feeds = _.uniqBy([...watchedState.data.feeds, feed], 'rssUrl');
    watchedState.data.posts = _.uniqBy([...watchedState.data.posts, ...posts], 'link');
  });

const submitFeed = (url, watchedState) => {
  watchedState.rssForm.processState = stateStatuses.processing;
  return loadFeed(url, watchedState)
    .then(() => {
      watchedState.rssForm.processMsg = i18n.t('feedback.addedRss');
      watchedState.rssForm.processState = stateStatuses.success;
    })
    .catch((err) => {
      console.log(err);
      watchedState.rssForm.processMsg = err.message;
      watchedState.rssForm.processState = stateStatuses.failed;
    });
};

const refreshFeeds = (watchedState) => {
  const { feeds } = watchedState.data;
  const feedPromises = feeds.map((feed) => {
    const feedPromise = loadFeed(feed.rssUrl, watchedState)
      .catch((err) => {
        console.log(err);
      });
    return feedPromise;
  });

  const allFeeds = Promise.all(feedPromises);
  return allFeeds.then(() => setTimeout(refreshFeeds, refreshTimeout, watchedState));
};

export default () => {
  const state = {
    lng: 'ru',
    rssForm: {
      processState: null,
      processMsg: null,
    },
    data: {
      feeds: [],
      posts: [],
    },
    modal: {},
    ui: {
      viewedPosts: new Set(),
    },
    errors: [],
  };

  const pageElements = {
    title: document.querySelector('h1'),
    desc: document.querySelector('.lead'),
    example: document.querySelector('.example'),
    rssForm: {
      form: document.querySelector('.rss-form'),
      fieldset: document.querySelector('.rss-form').querySelector('fieldset'),
      input: document.querySelector('.rss-form').querySelector('input'),
      submit: document.querySelector('.rss-form').querySelector('button'),
    },
    feedback: document.querySelector('.feedback'),
    feeds: document.querySelector('.feeds'),
    posts: document.querySelector('.posts'),
    modal: document.querySelector('#modal'),
  };

  const watchedState = createWatchedState(state, pageElements, i18n);

  const initPromise = i18n.init({
    lng: state.lng,
    debug: !process.env.NODE_ENV === 'production',
    resources,
  }).then(() => {
    watchedState.rssForm.processState = stateStatuses.init;

    pageElements.rssForm.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const rssForm = new FormData(e.target);

      const url = rssForm.get('url');

      watchedState.rssForm.processState = stateStatuses.validating;
      const errMsg = validateRssForm(url, watchedState.data.feeds);

      if (errMsg === null) {
        submitFeed(url, watchedState);
      } else {
        watchedState.rssForm.processMsg = errMsg;
        watchedState.rssForm.processState = stateStatuses.invalid;
      }
    });

    pageElements.posts.addEventListener('click', (e) => {
      if (e.target.getAttribute('data-target') === '#modal') {
        const postId = e.target.getAttribute('data-id');
        const postPreviewIndex = _.findIndex(watchedState.data.posts,
          (currPost) => (currPost.id === postId));
        const postPreview = watchedState.data.posts[postPreviewIndex];

        watchedState.ui.viewedPosts.add(postPreview.id);
        watchedState.modal = {
          id: postPreview.id,
          title: postPreview.title,
          desc: postPreview.desc,
          link: postPreview.link,
        };
      }
    });

    setTimeout(refreshFeeds, refreshTimeout, watchedState);
  }).catch((err) => {
    watchedState.errors.push(err);
    throw err;
  });

  return initPromise;
};
