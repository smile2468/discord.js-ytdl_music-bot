const { Collection } = require('discord.js')

const AudioUtils = require('./AudioUtils')
const Queue = require('./Queue')
const QueueEvents = require('./QueueEvents')
const { AudioError, DefaultError } = require('../../errors')

class Audio {
  constructor (client) {
    this.client = client
    this.players = new Collection()
    this.utils = new AudioUtils(this.client)
    this.queue = new Queue(this)
    this.classPrefix = '[Audio'
    this.defaultPrefix = {
      init: `${this.classPrefix}:Init]`,
      setPlayer: `${this.classPrefix}:SetPlayer]`,
      getPlayer: `${this.classPrefix}:GetPlayer]`,
      removePlayer: `${this.classPrefix}:RemovePlayer]`,
      initConnSetPlayer: `${this.classPrefix}:InitConnSetPlayer]`,
      play: `${this.classPrefix}:Play]`,
      stop: `${this.classPrefix}:Stop]`,
      leave: `${this.classPrefix}:Leave]`,
      skip: `${this.classPrefix}:Skip]`,
      pause: `${this.classPrefix}:Pause]`,
      resume: `${this.classPrefix}:Resume]`,
      destroy: `${this.classPrefix}:Destroy]`,
      setVolume: `${this.classPrefix}:SetVolume]`,
      dispatcherEvents: `${this.classPrefix}:DispatcherEvents]`,
      checkQueueOrNowPlaying: `${this.classPrefix}:CheckQueueOrNowPlaying]`
    }
    this.loadMissStack = 0
    const queueEvents = new QueueEvents(this.client)
    this.queue.on('queueEvent', data => queueEvents.handleEvents(data))
  }

  async init () {
    this.client.logger.debug(`${this.defaultPrefix.init} Initializing...`)
    await this.utils.bugsParser.init()
    this.initConnSetPlayer()
    if (!this.client.audio_initialized) await this.checkQueueOrNowPlaying()
    this.client.audio_initialized = true
  }

  async checkQueueOrNowPlaying () {
    const getGuildDataToMany = await this.client.database.models.guild.find()
    for (const guildData of getGuildDataToMany) {
      this.client.logger.debug(`${this.defaultPrefix.checkQueueOrNowPlaying} Checking guildData to queue or nowPlaying via guildId: ${guildData._id}`)
      if (guildData?.queue && guildData.queue.length !== 0) {
        this.client.logger.debug(`${this.defaultPrefix.checkQueueOrNowPlaying} Found debris queue to guildData via guildId: ${guildData._id}`)
        await this.client.database.updateGuild(guildData._id, { $set: { queue: [] } })
      }
      if (guildData?.nowPlaying && Object.keys(guildData.nowPlaying).length !== 0) {
        this.client.logger.debug(`${this.defaultPrefix.checkQueueOrNowPlaying} Found debris nowPlaying to guildData via guildId: ${guildData._id}`)
        await this.client.database.updateGuild(guildData._id, { $set: { nowPlaying: {} } })
      }
    }
  }

  initConnSetPlayer () {
    const connections = this.client.voice.connections.filter(el => el.values).array()
    if (connections.length === 0) return true
    for (const connection of connections) {
      if (connection?.values) {
        this.client.logger.info(`${this.defaultPrefix.initConnSetPlayer} Connection valus an Re-Setting to Player via guildId: ${connection.values.guildId}`)
        this.setPlayer(connection?.values?.guildId, connection?.values?.vchId, connection?.values?.tchId)
      }
    }
    return true
  }

  getPlayer (guildId) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.getPlayer} guildId is not provided!`)
    this.client.logger.debug(`${this.defaultPrefix.getPlayer} Get Player: ${guildId}`)
    return this.players.get(guildId)
  }

  setPlayer (guildId, vchId, tchId, force = false) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.setPlayer} guildId is not provided!`)
    if (!vchId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.setPlayer} vchId is not provided!`)
    if (!tchId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.setPlayer} tchId is not provided!`)
    const getPlayer = this.getPlayer(guildId)
    if (!force && getPlayer && getPlayer.vchId === vchId) throw new AudioError.PlayerIsAlreadyError(`${this.defaultPrefix.setPlayer} Player is already to VC via vchId: ${getPlayer.vchId} & guildId: ${getPlayer.guildId}`)
    this.client.database.getGuild(guildId).then(guildData => {
      const getVoiceChannel = this.client.channels.cache.get(vchId)
      if (guildData.paused) {
        this.client.database.updateGuild(guildId, { $set: { paused: false } })
        this.client.database.updateGuild(guildId, { $set: { nowPlaying: {} } })
        this.queue.clearQueue(guildId)
      }
      getVoiceChannel.join().then(connection => {
        this.client.logger.debug(`${this.defaultPrefix.setPlayer} Connected to VoiceChannel via vchId: ${connection.channel.id} & guildId: ${connection.channel.guild.id} & force: ${force}`)
        Object.assign(connection, { values: { guildId, vchId, tchId } })
        this.client.logger.debug(`${this.defaultPrefix.setPlayer} Setting player to VoiceChannel via vchId: ${connection.channel.id} & guildId: ${connection.channel.guild.id} & force: ${force}`)
        this.client.database.getGuild(guildId).then(el => { this.players.set(guildId, { guildId, vchId, tchId, connection, nowPlaying: {}, paused: false, repeat: el.repeat ?? false, pinned: el.pinned ?? false }) })
        setTimeout(() => {
          const getGuildAudioPlayer = this.players.get(guildId)
          if (!getGuildAudioPlayer?.connection) {
            this.client.logger.debug(`[CheckPlayerToConnection] Connection is not found via guildId: ${guildId}`)
            getGuildAudioPlayer.connection = this.client.voice.connections.get(guildId)
          }
          const isNowPlaying = typeof getGuildAudioPlayer?.nowPlaying === 'object' ? Object.keys(getGuildAudioPlayer?.nowPlaying).length === 0 : false
          if (isNowPlaying && getGuildAudioPlayer.connection.dispatcher?.count && getGuildAudioPlayer.connection.dispatcher?.count !== 0) {
            this.client.logger.debug(`[CheckPlayerToNowPlaying] NowPlaying is not found via guildId: ${guildId}`)
            this.client.database.getGuild(guildId).then(guildData => { getGuildAudioPlayer.nowPlaying = guildData.nowPlaying })
          }
        }, 2500)
      }).catch(e => {
        this.client.logger.error(`${this.defaultPrefix.setPlayer} Connecting to VoiceChannel an error occurred via vchId: ${vchId} & guildId: ${guildId} & force: ${force}\n${e.stack}`)
        throw new AudioError.ConnectionError(`${this.defaultPrefix.setPlayer} Failed Connection to VoiceChannel via vchId: ${vchId} & guildId: ${guildId} & force: ${force}\n${e.stack}`)
      })
    })
  }

  removePlayer (guildId) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.removePlayer} guildId is not provided!`)
    const getPlayer = this.getPlayer(guildId)
    if (!getPlayer) throw new AudioError.NotFoundPlayerError(`${this.defaultPrefix.removePlayer} Player is already destroyed to guild via guildId: ${guildId}`)
    return this.players.delete(guildId)
  }

  async play (guildId, track) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.play} guildId is not provided!`)
    if (!track) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.play} track is not provided!`)
    if (typeof track !== 'object') throw new DefaultError.TypeError(`${this.defaultPrefix.play} track must be a object!`)
    const getPlayer = this.getPlayer(guildId)
    if (!getPlayer || !getPlayer?.connection) return false
    const getGuild = await this.client.database.getGuild(guildId)
    const dispatcher = await getPlayer.connection.play(track?.isYoutube ? this.utils.getAudioTovId(track.id) : track.url, { volume: getGuild.volume / 100 })
    getPlayer.nowPlaying = track
    this.queue.emit('queueEvent', { guildId, track, op: 'trackStarted' })
    this.registerDispatcherEvents(dispatcher, guildId, track)
    await this.client.database.updateGuild(guildId, { $pop: { queue: -1 } })
    await this.client.database.updateGuild(guildId, { $set: { nowPlaying: track } })
    await this.client.database.updateGuild(guildId, { $set: { paused: false } })
  }

  async leave (guildId) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.leave} guildId is not provided!`)
    const getPlayer = this.getPlayer(guildId)
    if (!getPlayer || !getPlayer?.connection) return true
    this.client.logger.debug(`${this.defaultPrefix.leave} Leave to VC via vchId: ${getPlayer.vchId} & guildId: ${getPlayer.guildId}`)
    return getPlayer.connection.channel.leave()
  }

  async stop (guildId, clearQueue = true, leave = true) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.stop} guildId is not provided!`)
    if (clearQueue) {
      this.queue.clearQueue(guildId)
      await this.client.database.updateGuild(guildId, { $set: { nowPlaying: null } })
    }
    await this.destroy(guildId)
    await this.client.audio.utils.nowPlayingMessageUpdater(guildId, true)
    if (leave) {
      await this.leave(guildId)
      this.removePlayer(guildId)
    }
    return true
  }

  async pause (guildId) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.pause} guildId is not provided!`)
    this.client.logger.debug(`${this.defaultPrefix.pause} Pause Player to guild via guildId: ${guildId}`)
    const getPlayer = this.getPlayer(guildId)
    const getGuild = await this.client.database.getGuild(guildId)
    if (getGuild.paused && getPlayer.paused) {
      this.client.logger.debug(`${this.defaultPrefix.pause} Already Paused Player to guild via guildId: ${guildId}`)
      return true
    }
    getPlayer.paused = true
    await this.client.database.updateGuild(guildId, { $set: { paused: true } })
    await this.utils.updateNowPlayingMessage(guildId)
    const getTimer = this.utils.updateMowPlayingMessageTimer.get(guildId)
    if (getTimer) await Promise.all([clearInterval(getTimer), this.utils.updateMowPlayingMessageTimer.delete(guildId)])
    return getPlayer.connection.player?.dispatcher?.pause()
  }

  async resume (guildId) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.pause} guildId is not provided!`)
    this.client.logger.debug(`${this.defaultPrefix.resume} Resume Player to guild via guildId: ${guildId}`)
    const getPlayer = this.getPlayer(guildId)
    const getGuild = await this.client.database.getGuild(guildId)
    if (!getGuild.paused && !getPlayer.paused) {
      this.client.logger.debug(`${this.defaultPrefix.resume} Already Resumed Player to guild via guildId: ${guildId}`)
      return true
    }
    getPlayer.paused = false
    await this.client.database.updateGuild(guildId, { $set: { paused: false } })
    await this.utils.updateNowPlayingMessage(guildId)
    const getTimer = this.utils.updateMowPlayingMessageTimer.get(guildId)
    if (!getTimer) await this.utils.nowPlayingMessageUpdater(guildId)
    return getPlayer.connection.player?.dispatcher?.resume()
  }

  async destroy (guildId) {
    this.client.logger.debug(`${this.defaultPrefix.destroy} Destroying Player Events to guild via guildId: ${guildId}`)
    const getPlayer = this.getPlayer(guildId)
    if (!getPlayer) throw new AudioError.NotFoundPlayerError(`Player is not found to guild via guildId: ${guildId}`)
    if (getPlayer.connection.dispatcher) await getPlayer.connection.dispatcher.removeAllListeners()
    await getPlayer.connection.player.removeAllListeners()
    return true
  }

  registerDispatcherEvents (dispatcher, guildId, track) {
    this.client.logger.debug(`${this.defaultPrefix.dispatcherEvents} Register Dispatcher Events to Player via guildId: ${guildId}`)
    dispatcher.on('finish', async () => {
      this.client.logger.info(`${this.defaultPrefix.dispatcherEvents} Playback Ended to ${track.id} via guildId: ${guildId}`)
      const guildData = await this.client.database.getGuild(guildId)
      const getPlayer = this.getPlayer(guildId)
      if (guildData.repeat) await this.client.database.updateGuild(guildId, { $push: { queue: track } })
      await this.client.database.updateGuild(guildId, { $set: { nowPlaying: null } })
      getPlayer.nowPlaying = undefined
      await this.destroy(guildId)
      await this.queue.playNext(guildId)
    })
  }

  async setVolume (guildId, volume) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.setVolume} guildId is not provided!`)
    if (!volume) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.setVolume} volume is not provided!`)
    if (isNaN(Number(volume)) || typeof Number(volume) !== 'number') throw new DefaultError.TypeError(`${this.defaultPrefix.setVolume} volume must be a number!`)
    this.client.database.updateGuild(guildId, { $set: { volume } })
    const getPlayer = this.getPlayer(guildId)
    if (!getPlayer || !getPlayer?.connection?.dispatcher) return false
    // const currentVolume = getPlayer.connection.player.dispatcher.volume
    // const setVolume = Number(volume) / 100
    // let vol = Number(currentVolume)
    // await this.client.database.updateGuild(guildId, { $set: { volumeFader: true } })
    // const arr = []
    // while (true) {
    //   if (setVolume !== vol) {
    //     if (setVolume > vol) {
    //       vol = Number(Number(vol + 0.01).toFixed(2))
    //       arr.push(vol)
    //       this.client.logger.debug(`${this.defaultPrefix.setVolume} Set AudioFader Volume on ${setVolume}% (${vol}%) to guild via guildId: ${guildId}`)
    //       await getPlayer.connection.player.dispatcher.setVolume(vol)
    //       await this.client.wait(25)
    //     } else if (setVolume < vol) {
    //       vol = Number(Number(vol - 0.01).toFixed(2))
    //       arr.push(vol)
    //       this.client.logger.debug(`${this.defaultPrefix.setVolume} Set AudioFader Volume on ${setVolume}% (${vol}%) to guild via guildId: ${guildId}`)
    //       await getPlayer.connection.player.dispatcher.setVolume(vol)
    //       await this.client.wait(25)
    //     }
    //   } else break
    // }
    // await this.client.database.updateGuild(guildId, { $set: { volumeFader: false } })
    // return arr
    return getPlayer.connection.dispatcher.setVolume(volume / 100)
  }
}

module.exports = Audio
