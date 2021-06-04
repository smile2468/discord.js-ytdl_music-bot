const { Client, Collection, Intents } = require('discord.js')
const Utils = require('../utils')
const AudioStructure = require('./Audio')
const path = require('path')
const { promisify } = require('util')

class BaseClient extends Client {
  constructor (options) {
    super({ disableMentions: 'everyone', ws: { intents: Intents.ALL } })
    this._options = options
    this.utils = Utils
    this.logger = new Utils.Logger(this)
    this.database = new Utils.Database(this)
    this.permissionChecker = new Utils.PermissionChecker(this)
    this.bugsParser = new Utils.BugsParser(this)
    this.audio = new AudioStructure.Audio(this)
    this.audioCache = new AudioStructure.AudioCache(this)
    this.events = new Collection()
    this.commands = new Collection()
    this.aliases = new Collection()
    this.globAsync = promisify(require('glob'))
    this.wait = promisify(setTimeout)
    this.debug = false
    this.isReload = false
    this.models_loaded = false
    this.commands_loaded = false
    this.events_loaded = false
    this.initialized = false
    this.audio_initialized = false
    this.classPrefix = '[Client'
    this.defaultPrefix = {
      init: `${this.classPrefix}:Init]`,
      loadCommands: `${this.classPrefix}:LoadCommands]`,
      reloadCommands: `${this.classPrefix}:ReloadCommands]`,
      loadEvents: `${this.classPrefix}:LoadEvents]`,
      reloadEvents: `${this.classPrefix}:ReloadEvents]`,
      registerEvents: `${this.classPrefix}:RegisterEvents]`,
      setActivity: `${this.classPrefix}:SetActivity]`,
      reload: `${this.classPrefix}:Reload]`
    }
  }

  async init () {
    this.logger.debug(`${this.defaultPrefix.init} Initializing...`)
    await this.registerEvents()
    await this.loadCommands()
    await this.database.init()
    await this.audio.init()
    await this.login(this._options.bot.token)
  }

  async registerEvents (reload = false) {
    this.logger.debug(`${this.defaultPrefix.registerEvents} Register Events...`)
    const reloadOrLoadPrefix = this.events_loaded ? this.defaultPrefix.reloadEvents : this.defaultPrefix.loadEvents
    const reloadOrLoadSubfix = this.events_loaded ? 'Reload' : 'Load'
    this.logger.debug(`${reloadOrLoadPrefix} ${reloadOrLoadSubfix} Events...`)
    const loadedEvents = await this.globAsync(path.join(process.cwd(), '/src/events/**/*.js'))
    this.logger.info(`${reloadOrLoadPrefix} ${reloadOrLoadSubfix}ed Events: ${loadedEvents.length}`)
    for (const file of loadedEvents) {
      const Event = new (require(file))(this)
      if (reload) {
        const { listener } = this.events.get(Event.name)
        if (listener) {
          this.removeListener(Event.name, listener)
          this.logger.warn(`${this.defaultPrefix.registerEvents} Removed Event Listener to ${Event.name}`)
          this.events.delete(Event.name)
        }
      }
      delete require.cache[require.resolve(file)]
      this.logger.debug(`${this.defaultPrefix.registerEvents} Added Event Listener to ${Event.name}`)
      this.on(Event.name, Event.listener)
      this.events.set(Event.name, Event)
    }
    this.logger.info(`${this.defaultPrefix.registerEvents} Successfully Events Registered and ${reloadOrLoadSubfix}ed!`)
    this.events_loaded = true
    return this.events
  }

  async loadCommands () {
    const reloadOrLoadPrefix = this.commands_loaded ? this.defaultPrefix.reloadCommands : this.defaultPrefix.loadCommands
    const reloadOrLoadSubfix = this.commands_loaded ? 'Reload' : 'Load'
    this.logger.debug(`${reloadOrLoadPrefix} ${reloadOrLoadSubfix}ing Commands...`)
    const loadedCommands = await this.globAsync(path.join(process.cwd(), '/src/commands/**/*.js'))
    this.logger.info(`${reloadOrLoadPrefix} ${reloadOrLoadSubfix}ed Commands: ${loadedCommands.length}`)
    for (const file of loadedCommands) {
      const Command = new (require(file))(this)
      this.logger.debug(`${reloadOrLoadPrefix} ${reloadOrLoadSubfix}ing Command: ${Command.name}`)
      this.logger.debug(`${reloadOrLoadPrefix} Added Aliases (${Command.aliases.length}) to ${Command.name}`)
      for (const aliases of Command.aliases) this.aliases.set(aliases, Command.name)
      this.commands.set(Command.name, Command)
      delete require.cache[require.resolve(file)]
    }
    this.logger.info(`${reloadOrLoadPrefix} Successfully Command ${reloadOrLoadSubfix}ed!`)
    this.commands_loaded = true
    return this.commands
  }

  async reload (reloadBugsParser = false, clearedDebirsAudio = false) {
    this.isReload = true
    if (clearedDebirsAudio) this.audio_initialized = false
    await this.registerEvents(true)
    await this.loadCommands()
    for (const util of await this.globAsync(path.join(process.cwd(), 'src/utils/**/*.js'))) if (reloadBugsParser ? true : !util.includes('BugsParser.js')) delete require.cache[require.resolve(util)]
    for (const structure of await this.globAsync(path.join(process.cwd(), 'src/structures/**/*.js'))) if (!structure.includes('BaseClient.js') || !structure.includes('AudioCache.js')) delete require.cache[require.resolve(structure)]
    for (const error of await this.globAsync(path.join(process.cwd(), 'src/errors/**/*.js'))) delete require.cache[require.resolve(error)]
    delete require.cache[require.resolve('../utils/constructors')]
    delete require.cache[require.resolve('../../settings')]
    const { Database, PermissionChecker, constructors } = require('../utils')
    this.utils.constructors = constructors
    this._options = require('../../settings')
    this.utils = require('../utils')
    this.database = new Database(this)
    this.permissionChecker = new PermissionChecker(this)
    await this.database.loadModels(true)
    if (reloadBugsParser) {
      try {
        await Promise.all([this.bugsParser.autoUpdaterScheduler.stop(), this.bugsParser.autoUpdaterScheduler.destroy()])
        const { BugsParser } = require('../utils')
        this.bugsParser = new BugsParser(this)
        this.bugsParser.init()
      } catch {}
    }
    const KeyList = []
    for (const key of this.audio.utils.updateMowPlayingMessageTimer.keyArray()) {
      clearInterval(this.audio.utils.updateMowPlayingMessageTimer.get(key))
      KeyList.push(key)
    }
    const { Audio, AudioUtils } = require('../structures/Audio')
    this.audio = new Audio(this)
    this.audio.utils = new AudioUtils(this)
    await this.audio.init()
    for (const key of KeyList) await this.audio.utils.nowPlayingMessageUpdater(key)
    this.isReload = false
  }

  getInfo () {
    const mem = process.memoryUsage()
    return {
      guilds: this.guilds.cache.size,
      users: this.users.cache.size,
      players: this.audio.players.size,
      memoryUsage: `ArrayBuffers: ${this.utils.niceBytes(mem.arrayBuffers)}, External: ${this.utils.niceBytes(mem.external)}, Heaptotal: ${this.utils.niceBytes(mem.heapTotal)}, Heapused: ${this.utils.niceBytes(mem.heapUsed)}, Rss: ${this.utils.niceBytes(mem.rss)}`
    }
  }
}

process.on('uncaughtException', (error) => console.error(error))
process.on('unhandledRejection', (reason, promise) => console.error(reason))

module.exports = BaseClient
