const { BaseEvent } = require('../structures')

class Event extends BaseEvent {
  constructor (client) {
    super(
      client,
      'disconnect',
      (...args) => this.run(...args)
    )
    this.dir = __filename
  }

  async run (reason) { this.client.logger.error(`[Events:Disconnect] ${reason}`) }
}

module.exports = Event
