const { BaseEvent } = require('../structures')
class Event extends BaseEvent {
  constructor (client) {
    super(
      client,
      'guildMemberAdd',
      (...args) => this.run(...args)
    )
  }

  async run (member) {
    this.client.logger.info(`[Events:GuildMemberAdd] Member has entered Guild via guildId: ${member.guild.id} & memberId: ${member.id}`)
    if (member.user.bot) return
    this.client.database.getUser(member.id)
    this.client.database.getMember(member.id, member.guild.id)
  }
}

module.exports = Event
