const { BaseEvent } = require('../structures')

class Event extends BaseEvent {
  constructor (client) {
    super(
      client,
      'messageReactionAdd',
      (...args) => this.run(...args)
    )
    this.dir = __filename
  }

  async run (messageReaction, user) {
    if (messageReaction.message.channel.type === 'dm' || user.bot) return
    const guildData = await this.client.database.getGuild(messageReaction.message.guild.id)
    const getNowPlayingMessageUpdater = this.client.audio.utils.updateMowPlayingMessageTimer.get(messageReaction.message.guild.id)
    if (getNowPlayingMessageUpdater && guildData.nowPlayingMessage === messageReaction.message.id && messageReaction.emoji.name === this.client.utils.constructors.EMOJI_PIN) {
      await this.client.database.updateGuild(messageReaction.message.guild.id, { $set: { pinned: !guildData.pinned } })
      await this.client.audio.utils.updateNowPlayingMessage(messageReaction.message.guild.id)
      try { messageReaction.users.remove(user.id) } catch {}
    }
  }
}

module.exports = Event
