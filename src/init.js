/* eslint-disable no-param-reassign */
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.css';
import * as yup from 'yup';
import axios from 'axios';
import _ from 'lodash';
import i18n from 'i18next';
import createWatchedState from './view.js';
import resources from './locales';
import { stateStatuses, refreshTimeout, processMsgTypes } from './constants.js';

const getUrlWithProxy = (rssUrl) => `https://api.allorigins.win/get?url=${rssUrl}`;

const validateRssForm = (url, feeds) => {
  const addedUrls = feeds.map(({ rssUrl }) => (rssUrl));

  const urlSchema = yup.string().url()
    .notOneOf(addedUrls, (str) => ({ key: processMsgTypes.existsRss, values: { str } }));

  try {
    urlSchema.validateSync(url);
    return null;
  } catch (err) {
    return err;
  }
};

const parseRss = (rssData) => {
  const rssDocument = new DOMParser().parseFromString(rssData, 'text/xml');
  const errorEl = rssDocument.querySelector('parsererror');
  if (errorEl !== null) {
    console.log(errorEl.textContent);
    const error = new Error(errorEl.textContent);
    error.isParsingError = true;
    throw error;
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

const getFeedData = (url) => axios
  .get(getUrlWithProxy(url))
  .then((response) => {
    const channel = parseRss(response.data.contents);
    channel.rssUrl = response.data.status.url;

    return channel;
  });

const submitFeed = (url, watchedState) => getFeedData(url)
  .then((feedData) => {
    const feed = {
      id: _.uniqueId(),
      rssUrl: feedData.rssUrl,
      title: feedData.title,
      desc: feedData.description,
    };
    watchedState.data.feeds = [feed, ...watchedState.data.feeds];

    const posts = feedData.posts.map((post) => (
      {
        feedId: feed.id,
        id: _.uniqueId(),
        title: post.title,
        link: post.link,
        desc: post.description,
      }));
    watchedState.data.posts = [...posts, ...watchedState.data.posts];

    watchedState.rssForm.processState = stateStatuses.success;
  })
  .catch((err) => {
    if (err.isAxiosError) {
      watchedState.rssForm.processMsgType = processMsgTypes.networkError;
    } else if (err.isParsingError) {
      watchedState.rssForm.processMsgType = processMsgTypes.invalidFeed;
    } else {
      watchedState.rssForm.processMsgType = processMsgTypes.undefined;
    }

    console.log(err);
    watchedState.rssForm.processState = stateStatuses.failed;
  });

const refreshFeeds = (watchedState) => {
  const { feeds } = watchedState.data;
  const feedPromises = feeds.map((feed) => {
    const feedPromise = getFeedData(feed.rssUrl)
      .then((feedData) => {
        const existingFeedPosts = watchedState.data.posts
          .filter((post) => post.feedId === feed.id);
        const newPosts = _.differenceBy(feedData.posts, existingFeedPosts, 'link')
          .map((newPost) => (
            {
              feedId: feed.id,
              id: _.uniqueId(),
              title: newPost.title,
              link: newPost.link,
              desc: newPost.description,
            }));
        watchedState.data.posts = [...newPosts, ...watchedState.data.posts];
      })
      .catch((err) => {
        console.log(err);
      });
    return feedPromise;
  });

  const allFeeds = Promise.all(feedPromises);
  return allFeeds.finally(() => setTimeout(refreshFeeds, refreshTimeout, watchedState));
};

export default () => {
  const state = {
    lng: 'ru',
    rssForm: {
      processState: null,
      processMsgType: null,
    },
    data: {
      feeds: [],
      posts: [],
    },
    modal: {},
    ui: {
      viewedPosts: new Set(),
    },
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

  const watchedState = createWatchedState(state, pageElements);

  const initPromise = i18n.init({
    lng: state.lng,
    debug: !process.env.NODE_ENV === 'production',
    resources,
  }).then(() => {
    watchedState.rssForm.processState = stateStatuses.init;

    yup.setLocale({
      string: {
        url: ({ str }) => ({ key: processMsgTypes.invalidUrl, values: { str } }),
      },
    });

    pageElements.rssForm.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const rssForm = new FormData(e.target);

      const url = rssForm.get('url');

      watchedState.rssForm.processState = stateStatuses.processing;
      const err = validateRssForm(url, watchedState.data.feeds);

      if (err === null) {
        submitFeed(url, watchedState);
      } else {
        watchedState.rssForm.processMsgType = err.message.key;
        watchedState.rssForm.processState = stateStatuses.invalid;
      }
    });

    pageElements.posts.addEventListener('click', (e) => {
      if (e.target.getAttribute('data-target') === '#modal') {
        const postId = e.target.getAttribute('data-id');
        watchedState.ui.viewedPosts.add(postId);
        watchedState.modal = {
          id: postId,
        };
      }
    });

    setTimeout(refreshFeeds, refreshTimeout, watchedState);
  });

  return initPromise;
};
