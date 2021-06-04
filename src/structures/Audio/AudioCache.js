const { Collection } = require('discord.js')

class AudioCache {
  constructor (client) {
    this.client = client
    this.cache = new Collection()
    this.classPrefix = '[AudioCache'
    this.defaultPrefix = {
      getAudioCache: `${this.classPrefix}:GetAudioCache]`,
      setAudioCache: `${this.classPrefix}:SetAudioCache]`,
      deleteAudioCache: `${this.classPrefix}:DelteAudioCache]`,
      clearAudioCache: `${this.classPrefix}:ClearAudioCache]`,
      ignoreAudioCache: `${this.classPrefix}:IgnoreAudioCache]`
    }
  }

  get (key) {
    if (!key) throw new Error(`${this.defaultPrefix.getAudioCache} Key is not provided!`)
    this.client.logger.debug(`${this.defaultPrefix.getAudioCache} Get Audio Cache via key: ${key}`)
    const result = this.cache.get(key)
    return result
  }

  set (key, value) {
    if (!key || !value) throw new Error(`${this.defaultPrefix.setAudioCache} Key or Value is not provided!`)
    const result = this.get(key)
    if (result) {
      this.client.logger.debug(`${this.defaultPrefix.setAudioCache} Audio Cache has exist via key: ${key}`)
      return result
    }
    value.audio = this.client.audio.utils.getAudioTovId(value.id)
    this.client.logger.debug(`${this.defaultPrefix.setAudioCache} Audio Cache is not exist, Add to Audio Cache via key: ${key}`)
    return this.cache.set(key, value)
  }

  delete (key) {
    if (!key) throw new Error(`${this.defaultPrefix.deleteAudioCache} Key is not provided!`)
    const result = this.get(key)
    if (result) {
      this.client.logger.debug(`${this.defaultPrefix.deleteAudioCache} Audio Cache has exist, Delete to Audio Cache via key: ${key}`)
      this.cache.delete(key)
      return true
    }
    this.client.logger.debug(`${this.defaultPrefix.deleteAudioCache} Audio Cache is not exist via key: ${key}`)
    return true
  }

  clear () {
    this.client.logger.debug(`${this.defaultPrefix.clearAudioCache} Cleared Audio Cache!`)
    this.cache.clear()
    return true
  }

  ignore (key) {}
}

module.exports = AudioCache
