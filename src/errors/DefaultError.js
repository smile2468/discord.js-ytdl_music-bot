module.exports = {
  checkHasError: (errorName) => [
    'NotProvidedError',
    'TypeError'
  ].includes(String(errorName).split(':').pop().replace(']', '')),
  NotProvidedError: class NotProvidedError extends Error {
    constructor (...args) {
      super(...args)
      if (Error.captureStackTrace) Error.captureStackTrace(this, NotProvidedError)
      this.name = '[DefaultError:NotProvidedError]'
    }
  },
  TypeError: class TypeError extends Error {
    constructor (...args) {
      super(...args)
      if (Error.captureStackTrace) Error.captureStackTrace(this, TypeError)
      this.name = '[DefaultError:TypeError]'
    }
  }
}
