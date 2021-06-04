module.exports = {
  checkHasError: (errorName) => [
    'PlayerIsAlreadyError',
    'NotFoundPlayerError',
    'CloudNotLoadResourceError',
    'SendLogMessageError',
    'ConnectionError',
    'PlayingError'
  ].includes(String(errorName).split(':').pop().replace(']', '')),
  PlayerIsAlreadyError: class PlayerIsAlreadyError extends Error {
    constructor (...args) {
      super(...args)
      if (Error.captureStackTrace) Error.captureStackTrace(this, PlayerIsAlreadyError)
      this.nane = '[AudioError:PlayerIsAlreadyError]'
    }
  },
  NotFoundPlayerError: class NotFoundPlayerError extends Error {
    constructor (...args) {
      super(...args)
      if (Error.captureStackTrace) Error.captureStackTrace(this, NotFoundPlayerError)
      this.name = '[AudioErorr:NotFoundPlayerError]'
    }
  },
  CloudNotLoadResourceError: class CloudNotLoadResourceError extends Error {
    constructor (...args) {
      super(...args)
      if (Error.captureStackTrace) Error.captureStackTrace(this, CloudNotLoadResourceError)
      this.name = '[AudioError:CloudNotLoadResourceError]'
    }
  },
  SendLogMessageError: class SendLogMessageError extends Error {
    constructor (...args) {
      super(...args)
      if (Error.captureStackTrace) Error.captureStackTrace(this, SendLogMessageError)
      this.name = '[AudioError:SendLogMessageError]'
    }
  },
  ConnectionError: class ConnectionError extends Error {
    constructor (...args) {
      super(...args)
      if (Error.captureStackTrace) Error.captureStackTrace(this, ConnectionError)
      this.name = '[AudioError:ConnectionErorr]'
    }
  },
  PlayingError: class PlayingError extends Error {
    constructor (...args) {
      super(...args)
      if (Error.captureStackTrace) Error.captureStackTrace(this, PlayingError)
      this.name = '[AudioError:PlayingError]'
    }
  }
}
