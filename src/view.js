import onChange from 'on-change';

const processStateHandler = (state, stateStatuses, pageElements, processState, pageText) => {
  const { rssForm } = pageElements;
  const { feedback } = pageElements;

  switch (processState) {
    case stateStatuses.init:
      pageElements.title.textContent = pageText.t('title');
      pageElements.desc.textContent = pageText.t('description');
      pageElements.example.textContent = pageText.t('example');
      pageElements.rssForm.input.setAttribute('placeholder', pageText.t('rssForm.placeholder'));
      pageElements.rssForm.submit.textContent = pageText.t('rssForm.submit');
      pageElements.modal.querySelector('.full-article').textContent = pageText.t('modal.article');
      pageElements.modal.querySelector('.btn-secondary').textContent = pageText.t('modal.close');

      break;
    case stateStatuses.processing:
      rssForm.input.classList.remove('is-invalid');

      rssForm.fieldset.disabled = true;

      feedback.classList.remove('text-danger');
      feedback.classList.remove('text-success');
      feedback.textContent = pageText.t('feedback.submittingRSS');
      break;
    case stateStatuses.invalid:
      if (!rssForm.input.classList.contains('is-invalid')) {
        rssForm.input.classList.add('is-invalid');
      }

      rssForm.fieldset.disabled = false;

      feedback.classList.remove('text-success');
      if (!feedback.classList.contains('text-danger')) {
        feedback.classList.add('text-danger');
      }
      feedback.textContent = state.rssForm.processMsg;
      break;
    case stateStatuses.failed:
      rssForm.input.classList.remove('is-invalid');
      rssForm.fieldset.disabled = false;

      feedback.classList.remove('text-success');
      if (!feedback.classList.contains('text-danger')) {
        feedback.classList.add('text-danger');
      }
      feedback.textContent = state.rssForm.processMsg;
      break;
    case stateStatuses.success:
      rssForm.input.classList.remove('is-invalid');

      rssForm.fieldset.disabled = false;

      rssForm.input.value = null;
      rssForm.input.focus();

      feedback.classList.remove('text-danger');
      if (!feedback.classList.contains('text-success')) {
        feedback.classList.add('text-success');
      }
      feedback.textContent = state.rssForm.processMsg;
      break;
    default:
      throw new Error(`Unknown state: ${processState}`);
  }
};

const renderFeeds = (feeds, feedsEl, pageText) => {
  if (feeds.length > 0) {
    const titleEl = document.createElement('h2');
    titleEl.textContent = pageText.t('feeds.title');

    const listEl = document.createElement('ul');
    listEl.classList.add('list-group', 'mb-5');

    feeds.forEach((feed) => {
      const itemEl = document.createElement('li');
      itemEl.classList.add('list-group-item');

      const h3El = document.createElement('h3');
      h3El.textContent = feed.title;

      const pEl = document.createElement('p');
      pEl.textContent = feed.desc;

      itemEl.appendChild(h3El);
      itemEl.appendChild(pEl);

      listEl.prepend(itemEl);
    });

    const feedsFragment = document.createDocumentFragment();
    feedsFragment.appendChild(titleEl);
    feedsFragment.appendChild(listEl);

    feedsEl.innerHTML = '';
    feedsEl.appendChild(feedsFragment);
  } else {
    feedsEl.innerHTML = '';
  }
};

const renderPosts = (posts, postsEl, pageText) => {
  if (posts.length > 0) {
    const titleEl = document.createElement('h2');
    titleEl.textContent = pageText.t('posts.title');

    const listEl = document.createElement('ul');
    listEl.classList.add('list-group');

    posts
      .sort((postA, postB) => {
        const feedIdA = Number(postA.feedId);
        const feedIdB = Number(postB.feedId);
        const postIdA = Number(postA.id);
        const postIdB = Number(postB.id);

        if ((feedIdA > feedIdB) || (feedIdA === feedIdB && postIdA < postIdB)) {
          return -1;
        }
        if ((feedIdA < feedIdB) || (feedIdA === feedIdB && postIdA > postIdB)) {
          return 1;
        }
        return 0;
      })
      .forEach((post) => {
        const itemEl = document.createElement('li');
        itemEl.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start');

        const aEl = document.createElement('a');
        aEl.href = post.link;
        if (post.isViewed) {
          aEl.classList.add('font-weight-normal');
        } else {
          aEl.classList.add('font-weight-bold');
        }

        aEl.setAttribute('data-id', post.id);
        aEl.setAttribute('target', '_blank');
        aEl.setAttribute('rel', 'noopener noreferrer');
        aEl.textContent = post.title;

        const buttonEl = document.createElement('button');
        buttonEl.type = 'button';
        buttonEl.classList.add('btn', 'btn-primary', 'btn-sm');
        buttonEl.setAttribute('data-id', post.id);
        buttonEl.setAttribute('data-toggle', 'modal');
        buttonEl.setAttribute('data-target', '#modal');
        buttonEl.textContent = pageText.t('posts.preview');

        itemEl.appendChild(aEl);
        itemEl.appendChild(buttonEl);

        listEl.appendChild(itemEl);
      });

    const postsFragment = document.createDocumentFragment();
    postsFragment.appendChild(titleEl);
    postsFragment.appendChild(listEl);

    postsEl.innerHTML = '';
    postsEl.appendChild(postsFragment);
  } else {
    postsEl.innerHTML = '';
  }
};

const renderPostIsViewed = (postIndex, posts, postsEl, value) => {
  const postId = posts[postIndex].id;
  const postEl = postsEl.querySelector(`a[data-id="${postId}"]`);
  if (value) {
    postEl.classList.remove('font-weight-bold');
    postEl.classList.add('font-weight-normal');
  } else {
    postEl.classList.remove('font-weight-normal');
    postEl.classList.add('font-weight-bold');
  }
};

const renderModal = (modal, modalEl) => {
  modalEl.querySelector('.modal-title').textContent = modal.title;
  modalEl.querySelector('.modal-body').textContent = modal.desc;
  modalEl.querySelector('.full-article').href = modal.link;
};

export default (state, stateStatuses, pageElements, pageText) => {
  const watchedState = onChange(state, (path, value) => {
    const regex = RegExp(/^(data.posts).(\d+).(isViewed)$/);
    let checkPath = '';
    let postIndex = null;

    if (regex.test(path)) {
      const pathGroups = path.match(regex);
      checkPath = `${pathGroups[1]}.*.${pathGroups[3]}`;
      // eslint-disable-next-line prefer-destructuring
      postIndex = pathGroups[2];
    } else {
      checkPath = path;
    }

    switch (checkPath) {
      case 'rssForm.processState':
        processStateHandler(state, stateStatuses, pageElements, value, pageText);
        break;
      case 'data.feeds':
        renderFeeds(state.data.feeds, pageElements.feeds, pageText);
        break;
      case 'data.posts':
        renderPosts(state.data.posts, pageElements.posts, pageText);
        break;
      case 'data.posts.*.isViewed':
        renderPostIsViewed(postIndex, state.data.posts, pageElements.posts, value);
        break;
      case 'modal':
        renderModal(state.modal, pageElements.modal);
        break;
      default:
        break;
    }
  });

  return watchedState;
};
