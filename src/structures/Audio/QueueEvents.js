class QueueEvents {
  constructor (client) {
    this.client = client
    this.classPrefix = '[QueueEvents'
    this.defaultPrefix = {
      handleEvents: `${this.classPrefix}:HandleEvents]`,
      trackStarted: `${this.classPrefix}:TrackStartd]`,
      playBackEnded: `${this.classPrefix}:PlayBackEnded]`
    }
  }

  handleEvents (data) {
    this.client.logger.debug(`${this.defaultPrefix.handleEvents} Emitted Events to guild via guildId: ${data.guildId}`)
    switch (data.op) {
      case 'trackStarted':
        this.client.logger.debug(`${this.defaultPrefix.handleEvents} Event to ${data.op} on trackStartedEvent (Guild: ${data.guildId})`)
        return this.trackStartedEvent(data)
      case 'playBackEnded':
        this.client.logger.debug(`${this.defaultPrefix.handleEvents} Event to ${data.op} on playBackEndedEvent (Guild: ${data.guildId})`)
        return this.playBackEndedEvent(data)
    }
  }

  async trackStartedEvent (data) {
    await this.client.audio.utils.sendMessage(data.guildId, this.client.audio.utils.getMessagesObj('TRACK_STARTED')(data.track))
  }

  async playBackEndedEvent (data) {
    await this.client.audio.utils.sendMessage(data.guildId, this.client.audio.utils.getMessagesObj('ALL_SONGS_FINISHED')())
    await this.client.audio.stop(data.guildId)
  }
}

module.exports = QueueEvents
