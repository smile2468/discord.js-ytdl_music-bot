const { BaseEvent } = require('../structures')

class Event extends BaseEvent {
  constructor (client) {
    super(
      client,
      'guildCreate',
      (...args) => this.run(...args)
    )
  }

  async run (guild) {
    this.client.logger.info(`[Events:guildCreate] Entered to guild via guildId: ${guild.id}`)
    this.client.database.getGuild(guild.id)
  }
}

module.exports = Event
