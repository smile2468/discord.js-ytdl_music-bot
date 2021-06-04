module.exports = {
  checkHasError: (errorName) => [
    'ModelSaveError',
    'ConnectionError'
  ].includes(String(errorName).split(':').pop().replace(']', '')),
  ModelSaveError: class ModelSaveError extends Error {
    constructor (...args) {
      super(...args)
      if (Error.captureStackTrace) Error.captureStackTrace(this, ModelSaveError)
      this.name = '[DatabaseError:ModelSaveError]'
    }
  },
  ConnectionError: class ConnectionError extends Error {
    constructor (...args) {
      super(...args)
      if (Error.captureStackTrace) Error.captureStackTrace(this, ConnectionError)
      this.name = '[DatabaseError:ConnectionError]'
    }
  }
}
