const stateStatuses = {
  init: 'init',
  invalid: 'invalid',
  processing: 'processing',
  failed: 'failed',
  success: 'success',
};

const processMsgTypes = {
  networkError: 'networkError',
  invalidFeed: 'invalidFeed',
  invalidUrl: 'invalidUrl',
  existsRss: 'existsRss',
  undefined: 'undefined',
};

const refreshTimeout = 5 * 1000;

export { refreshTimeout, stateStatuses, processMsgTypes };
