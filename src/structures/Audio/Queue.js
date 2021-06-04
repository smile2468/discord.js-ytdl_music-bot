const { EventEmitter } = require('events')
const { DefaultError } = require('../../errors')

class Queue extends EventEmitter {
  constructor (audio) {
    super()
    this.client = audio.client
    this.audio = audio
    this.classPrefix = '[Queue'
    this.defaultPrefix = {
      getQueue: `${this.classPrefix}:GetQueue]`,
      enQueue: `${this.classPrefix}:EnQueue]`,
      deQueue: `${this.classPrefix}:DeQueue]`,
      clearQueue: `${this.classPrefix}:ClearQueue]`,
      playNext: `${this.classPrefix}:PlayNext]`,
      autoPlay: `${this.classPrefix}:AutoPlay]`
    }
  }

  async getQueue (guildId) {
    if (!guildId) return new DefaultError.NotProvidedError(`${this.defaultPrefix.getQueue} guildId is not provided!`)
    const getGuild = await this.client.database.getGuild(guildId)
    return getGuild?.queue ?? null
  }

  async enQueue (guildId, track) {
    this.client.logger.debug(`${this.defaultPrefix.enQueue} Add Queue to guild via guildId: ${guildId} & trackId: ${track.id}`)
    const getPlayer = this.audio.getPlayer(guildId)
    const msg = await this.client.channels.cache.get(getPlayer.tchId).send(this.audio.utils.getMessagesObj('LOAD_TRACK')())
    await this.client.database.updateGuild(guildId, { $push: { queue: track } })
    const getQueue = await this.getQueue(guildId)
    const getGuild = await this.client.database.getGuild(guildId)
    if (getQueue.length === 1 && !getGuild?.nowPlaying) {
      await msg.edit(this.audio.utils.getMessagesObj('TRACK_READY')(track))
    } else {
      await msg.edit(this.audio.utils.getMessagesObj('ADD_QUEUE_IN_TRACK')(track, getQueue.length))
    }
    await this.playNext(guildId)
  }

  async deQueue (guildId, skip = false) {
    this.client.logger.debug(`${this.defaultPrefix.deQueue} Remove Queue to guild via guildId: ${guildId} & skip: ${skip}`)
    if (skip) return this.playNext(guildId, true)
    await this.client.database.updateGuild(guildId, { $pop: { queue: -1 } })
    await this.playNext(guildId)
  }

  async clearQueue (guildId) {
    this.client.logger.debug(`${this.defaultPrefix.clearQueue} Cleared Queue to guild via guildId: ${guildId}`)
    await this.client.database.updateGuild(guildId, { $set: { queue: [] } })
  }

  async playNext (guildId, skip = false) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.playNext} guildId is not provided!`)
    const getGuild = await this.client.database.getGuild(guildId)
    const getQueue = await this.getQueue(guildId)
    if (getQueue.length > 0) {
      if (skip) {
        this.client.logger.debug(`${this.defaultPrefix.playNext} Skipping to Now playing track...`)
        await this.audio.destroy(guildId)
        await this.audio.play(guildId, getQueue[0])
        // await this.audio.utils.updateNowPlayingMessage(guildId)
      }
      if (!getGuild?.nowPlaying) {
        this.client.logger.debug(`${this.defaultPrefix.playNext} Play next song to track: ${getQueue[0].id}`)
        await this.audio.play(guildId, getQueue[0])
        // await this.audio.utils.updateNowPlayingMessage(guildId)
      }
      await this.audio.utils.updateNowPlayingMessage(guildId)
    } else {
      if (!getQueue[0]) {
        this.client.logger.debug(`${this.defaultPrefix.playNext} Nothing items to playing next! (Guild: ${guildId})`)
        await this.audio.utils.nowPlayingMessageUpdater(guildId, true)
        this.emit('queueEvent', { guildId, op: 'playBackEnded' })
      }
    }
  }
}

module.exports = Queue
