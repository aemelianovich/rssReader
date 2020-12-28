const stateStatuses = {
  init: 'init',
  validating: 'validating',
  invalid: 'invalid',
  processing: 'processing',
  failed: 'failed',
  success: 'success',
};

const refreshTimeout = 5 * 1000;

export { refreshTimeout, stateStatuses };
