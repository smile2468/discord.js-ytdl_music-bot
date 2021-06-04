const { BaseEvent } = require('../structures')
class Event extends BaseEvent {
  constructor (client) {
    super(
      client,
      'guildDelete',
      (...args) => this.run(...args)
    )
  }

  async run (guild) {
    this.client.logger.info(`[Events:guildDelete] Leave to guild via guildId: ${guild.id}`)
    this.client.database.removeGuild(guild.id)
  }
}

module.exports = Event
