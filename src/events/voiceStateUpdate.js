const { BaseEvent } = require('../structures')

class Event extends BaseEvent {
  constructor (client) {
    super(
      client,
      'voiceStateUpdate',
      (...args) => this.run(...args)
    )
    this.dir = __filename
  }

  async run (oldState, newState) {
    // Setup to Player -> Connection (Audio Connection)
    if (newState.channel) {
      if (newState.id === this.client.user.id) {
        const getPlayer = this.client.audio.getPlayer(newState.guild.id)
        if (!getPlayer) return
        getPlayer.connection = this.client.voice.connections.get(newState.guild.id)
      }
      // const getPlayer = this.client.audio.getPlayer(oldState.guild.id)
      // if (getPlayer && getPlayer.vchId === newState.channelID) {
      //   if (newState.channel.members > 0) {
      //     if (!getPlayer?.paused) return
      //     this.client.logger.info(`[voiceStateUpdate] Resumed Music to guild via guildId: ${newState.guild.id}`)
      //     await this.client.audio.resume(newState.guild.id)
      //   }
      // }
    }
    // Setup to Player -> Connection (Change Undefined)
    // if (oldState.channel) {
    // if (oldState.guild.id === '542599372836438016') console.log(oldState.channel.members)
    // if (oldState.id === this.client.user.id) {
    //   const getPlayer = this.client.audio.getPlayer(oldState.guild.id)
    //   if (!getPlayer) return
    //   getPlayer.connection = undefined
    // }
    // const getPlayer = this.client.audio.getPlayer(oldState.guild.id)
    // if (getPlayer && getPlayer.vchId === oldState.channelID) {
    //   if (oldState.channel.members.size === 0) {
    //     if (getPlayer?.paused) return
    //     this.client.logger.info(`[voiceStateUpdate] Paused Music to guild via guildId: ${oldState.guild.id}`)
    //     await this.client.audio.pause(oldState.guild.id)
    //     await this.client.audio.utils.sendMessage(oldState.guild.id, this.client.audio.utils.getMessageObj('VOICE_CHANNEL_MEMBERS_IS_EMPTY_TO_PAUSED')())
    //   }
    // }
    // }
  }
}

module.exports = Event
