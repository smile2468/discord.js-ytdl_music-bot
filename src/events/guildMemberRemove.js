const { BaseEvent } = require('../structures')

class Event extends BaseEvent {
  constructor (client) {
    super(
      client,
      'guildMemberRemove',
      (...args) => this.run(...args)
    )
  }

  async run (member) {
    this.client.logger.info(`[Events:GuildMemberRemove] Member has left Guild via guildId: ${member.guild.id} & memberId: ${member.id}`)
    if (member.user.bot) return
    this.client.database.removeMember(member.id, member.guild.id)
  }
}

module.exports = Event
