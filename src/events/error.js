const { BaseEvent } = require('../structures')

class Event extends BaseEvent {
  constructor (client) {
    super(
      client,
      'error',
      (...args) => this.run(...args)
    )
    this.dir = __filename
  }

  async run (error) { this.client.logger.warn(`[Events:Error] ${error}`) }
}

module.exports = Event
