const Mongo = require('mongoose')
const uuid = require('node-uuid')
const { DatabaseError } = require('../errors')

class Database {
  constructor (client) {
    this.client = client
    this.mongo = Mongo.connection
    this.models = {}
    this.reconnectTime = 5000
    this.reconnectTries = 0
    this.maxReconnectTries = 10
    this.classPrefix = '[Database'
    this.defaultPrefix = {
      init: `${this.classPrefix}:Init]`,
      getUser: `${this.classPrefix}:GetUser]`,
      getMember: `${this.classPrefix}:GetMember]`,
      getGuild: `${this.classPrefix}:GetGuild]`,
      getBot: `${this.classPrefix}:GetBot]`,
      updateUser: `${this.classPrefix}:UpdateUser]`,
      updateMember: `${this.classPrefix}:UpdateMember]`,
      updateGuild: `${this.classPrefix}:UpdateGuild]`,
      updateBot: `${this.classPrefix}:UpdateBot]`,
      removeUser: `${this.classPrefix}:RemoveUser]`,
      removeMember: `${this.classPrefix}:RemoveMember]`,
      removeGuild: `${this.classPrefix}:RemoveGuild]`,
      removeBot: `${this.classPrefix}:RemoveBot]`,
      addErrorInfo: `${this.classPrefix}:AddErrorInfo]`,
      loadModels: `${this.classPrefix}:LoadModels]`,
      reloadModels: `${this.classPrefix}:ReloadModels]`
    }
  }

  async init () {
    await this.loadModels()
    await this.connect()
  }

  async connect (re = false) {
    const msg = re ? 'Reconnecting' : 'Connecting'
    const startMs = new Date().getTime()
    this.client.logger.debug(`${this.defaultPrefix.init} ${msg} to MongoDB... (URL: ${this.client._options.db.mongo.url})`)
    this.client.logger.debug(`${this.defaultPrefix.init} MongoDB Options: (${JSON.stringify(this.client._options.db.mongo.options)})`)
    try {
      await Mongo.connect(this.client._options.db.mongo.url, this.client._options.db.mongo.options)
      this.connected = true
      this.client.logger.info(`${this.defaultPrefix.init} ${msg} to MongoDB! (URL: ${this.client._options.db.mongo.url})`)
    } catch (err) {
      this.client.logger.error(`${this.defaultPrefix.init} Failed to ${msg} MongoDB! (${new Date().getTime() - startMs}ms)\n${err.stack}`)
      if (this.maxReconnectTries <= this.reconnectTries) {
        this.client.logger.error(`${this.defaultPrefix.init} Failed to ${msg} MongoDB! (${this.reconnectTries} Tries)`)
        return new DatabaseError.ConnectionError(`${this.defaultPrefix.init} Failed to ${msg} MongoDB! (${this.reconnectTries} Tries)`)
      }
      const calculateReconnectTime = this.reconnectTime * (!this.reconnectTries ? 1 : this.reconnectTries)
      this.client.logger.info(`${this.defaultPrefix.init} Trying to ${msg} in ${calculateReconnectTime}ms, (${this.reconnectTries} Tries)`)
      setTimeout(() => {
        this.connect(true)
        this.reconnectTries++
      }, calculateReconnectTime)
    }
  }

  async loadModels (reload = false) {
    const reloadOrLoadPrefix = this.client.models_loaded ? this.defaultPrefix.reloadModels : this.defaultPrefix.loadModels
    const reloadOrLoadSubfix = this.client.models_loaded ? 'Reload' : 'Load'
    this.client.logger.debug(`${reloadOrLoadPrefix} ${reloadOrLoadSubfix}ing Database Models...`)

    const loadModels = await this.client.globAsync(require('path').join(process.cwd(), 'src/utils/models/**/*.js'))
    this.client.logger.info(`${reloadOrLoadPrefix} ${reloadOrLoadSubfix}ed Database Models: ${loadModels.length}`)

    if (reload) {
      for (const modelName of this.mongo.modelNames()) {
        this.mongo.deleteModel(modelName)
        this.client.logger.warn(`${reloadOrLoadPrefix} Deleted (${modelName}) Database Model.`)
      }
    }

    for (const model of loadModels) {
      const Model = require(model)
      this.models[Model.modelName] = Model.getModel
      this.mongo.models[Model.modelName] = Model.getModel
      this.client.logger.info(`${reloadOrLoadPrefix} Added (${Model.modelName}) Database Model.`)
      delete require.cache[require.resolve(model)]
    }
    this.client.logger.info(`${reloadOrLoadPrefix} Successfully Database Models ${reloadOrLoadSubfix}ed!`)
    this.client.models_loaded = true
    return this.models
  }

  async getGuild (guildId) {
    if (!guildId) {
      this.client.logger.error(`${this.defaultPrefix.getGuild} guildId is not provided!`)
      return new Error(`${this.defaultPrefix.getGuild} guildId is not provided!`)
    }
    this.client.logger.debug(`${this.defaultPrefix.getGuild} Get guild via guildId: ${guildId}`)
    let result = await this.mongo.collection('guild').findOne({ _id: guildId })
    if (!result) {
      this.client.logger.debug(`${this.defaultPrefix.getGuild} Get guild via guildId: ${guildId}, but guild is not exist, create one...`)
      try {
        result = await this.models.guild({ _id: guildId }).save()
      } catch (e) {
        this.client.logger.error(`${this.defaultPrefix.getGuild} Failed to create guild data via guildId: ${guildId}\n${e.stack}`)
        return new DatabaseError.ModelSaveError(`${this.defaultPrefix.getGuild} Failed to create guild data via guildId: ${guildId}`)
      }
    }
    return result
  }

  async getMember (memberId, guildId) {
    if (!guildId) {
      this.client.logger.error(`${this.defaultPrefix.getMember} guildId is not provided!`)
      return new Error(`${this.defaultPrefix.getMember} guildId is not provided!`)
    }
    if (!memberId) {
      this.client.logger.error(`${this.defaultPrefix.getMember} memberId is not provided!`)
      return new Error(`${this.defaultPrefix.getMember} memberId is not provided!`)
    }
    this.client.logger.debug(`${this.defaultPrefix.getMember} Get member via memberId: ${memberId} & guildId: ${guildId}`)
    const getFormatterId = this.getFormatter(memberId, guildId)
    let result = await this.mongo.collection('member').findOne({ _id: getFormatterId })
    if (!result) {
      this.client.logger.debug(`${this.defaultPrefix.getMember} Get member via memberId: ${memberId} & guildId: ${guildId}, but member is not exist, create one...`)
      try {
        result = await this.models.member({ _id: getFormatterId }).save()
      } catch (e) {
        this.client.logger.error(`${this.defaultPrefix.getMember} Failed to create guild data via memberId: ${memberId} & guildId: ${guildId}\n${e.stack}`)
        return new DatabaseError.ModelSaveError(`${this.defaultPrefix.getMember} Failed to create guild data via memberId: ${memberId} & guildId: ${guildId}`)
      }
    }
    return result
  }

  async getUser (userId) {
    if (!userId) {
      this.client.logger.error(`${this.defaultPrefix.getUser} userId is not provided!`)
      return new Error(`${this.defaultPrefix.getUser} userId is not provided!`)
    }
    this.client.logger.debug(`${this.defaultPrefix.getUser} Get user via userId: ${userId}`)
    let result = await this.mongo.collection('user').findOne({ _id: userId })
    if (!result) {
      this.client.logger.debug(`${this.defaultPrefix.getUser} Get user via userId: ${userId}, but user is not exist, create one...`)
      try {
        result = await this.models.user({ _id: userId }).save()
      } catch (e) {
        this.client.logger.error(`${this.defaultPrefix.getUser} Failed to create guild data via userId: ${userId}\n${e.stack}`)
        return new DatabaseError.ModelSaveError(`${this.defaultPrefix.getUser} Failed to create guild data via userId: ${userId}`)
      }
    }
    return result
  }

  async updateGuild (guildId, query, upsert = false) {
    if (!guildId) {
      this.client.logger.error(`${this.defaultPrefix.updateGuild} guildId is not provided!`)
      return new Error(`${this.defaultPrefix.updateGuild} guildId is not provided!`)
    }
    if (!query) {
      this.client.logger.error(`${this.defaultPrefix.updateGuild} query is not provided!`)
      return new Error(`${this.defaultPrefix.updateGuild} query is not provided!`)
    }
    if (typeof query !== 'object') {
      this.client.logger.error(`${this.defaultPrefix.updateGuild} query must be a object!`)
      return new Error(`${this.defaultPrefix.updateGuild} query must be a object!`)
    }
    if (Object.keys(query).length <= 0) {
      this.client.logger.error(`${this.defaultPrefix.updateGuild} query keys is not provided!`)
      return new Error(`${this.defaultPrefix.updateGuild} query keys is not provided!`)
    }
    this.client.logger.debug(`${this.defaultPrefix.updateGuild} Update Guild: ${guildId}, Query: ${JSON.stringify(query)}, Upsert: ${upsert}`)
    return this.mongo.collection('guild').updateOne({ _id: guildId }, query, { upsert })
  }

  async updateMember (memberId, guildId, query, upsert = false) {
    if (!memberId) {
      this.client.logger.error(`${this.defaultPrefix.updateMember} memberId is not provided!`)
      return new Error(`${this.defaultPrefix.updateMember} memberId is not provided!`)
    }
    if (!guildId) {
      this.client.logger.error(`${this.defaultPrefix.updateMember} guildId is not provided!`)
      return new Error(`${this.defaultPrefix.updateMember} guildId is not provided!`)
    }
    if (!query) {
      this.client.logger.error(`${this.defaultPrefix.updateMember} query is not provided!`)
      return new Error(`${this.defaultPrefix.updateMember} query is not provided!`)
    }
    if (typeof query !== 'object') {
      this.client.logger.error(`${this.defaultPrefix.updateMember} query must be a object!`)
      return new Error(`${this.defaultPrefix.updateMember} query must be a object!`)
    }
    if (Object.keys(query).length <= 0) {
      this.client.logger.error(`${this.defaultPrefix.updateMember} query keys is not provided!`)
      return new Error(`${this.defaultPrefix.updateMember} query keys is not provided!`)
    }
    const getFormatterId = this.getFormatter(guildId, memberId)
    this.client.logger.debug(`${this.defaultPrefix.updateMember} Update Member: ${getFormatterId}, Query: ${JSON.stringify(query)}, Upsert: ${upsert}`)
    return this.mongo.collection('member').updateOne({ _id: getFormatterId }, query, { upsert })
  }

  async updateUser (userId, query, upsert = false) {
    if (!userId) {
      this.client.logger.error(`${this.defaultPrefix.updateUser} userId is not provided!`)
      return new Error(`${this.defaultPrefix.updateUser} userId is not provided!`)
    }
    if (!query) {
      this.client.logger.error(`${this.defaultPrefix.updateUser} query is not provided!`)
      return new Error(`${this.defaultPrefix.updateUser} query is not provided!`)
    }
    if (typeof query !== 'object') {
      this.client.logger.error(`${this.defaultPrefix.updateUser} query must be a object!`)
      return new Error(`${this.defaultPrefix.updateUser} query must be a object!`)
    }
    if (Object.keys(query).length <= 0) {
      this.client.logger.error(`${this.defaultPrefix.updateUser} query keys is not provided!`)
      return new Error(`${this.defaultPrefix.updateUser} query keys is not provided!`)
    }
    this.client.logger.debug(`${this.defaultPrefix.updateUser} Update User: ${userId}, Query: ${JSON.stringify(query)}, Upsert: ${upsert}`)
    return this.mongo.collection('user').updateOne({ _id: userId }, query, { upsert })
  }

  async removeGuild (guildId) {
    if (!guildId) {
      this.client.logger.error(`${this.defaultPrefix.removeGuild} guildId is not provided!`)
      return new Error(`${this.defaultPrefix.removeGuild} guildId is not provided!`)
    }
    this.client.logger.debug(`${this.defaultPrefix.removeGuild} Removed Guild: ${guildId}`)
    return this.mongo.collection('guild').deleteOne({ _id: guildId })
  }

  async removeMember (memberId, guildId) {
    if (!memberId) {
      this.client.logger.error(`${this.defaultPrefix.removeMember} memberId is not provided!`)
      return new Error(`${this.defaultPrefix.removeMember} memberId is not provided!`)
    }
    if (!guildId) {
      this.client.logger.error(`${this.defaultPrefix.removeMember} guildId is not provided!`)
      return new Error(`${this.defaultPrefix.removeMember} guildId is not provided!`)
    }
    const getFormatterId = this.getFormatter(memberId, guildId)
    this.client.logger.debug(`${this.defaultPrefix.removeMember} Removed Member: ${getFormatterId}`)
    return this.mongo.collection('member').deleteOne({ _id: getFormatterId })
  }

  async removeUser (userId) {
    if (!userId) {
      this.client.logger.error(`${this.defaultPrefix.removeUser} userId is not provided!`)
      return new Error(`${this.defaultPrefix.removeUser} userId is not provided!`)
    }
    this.client.logger.debug(`${this.defaultPrefix.removeUser} Removed User: ${userId}`)
    return this.mongo.collection('user').deleteOne({ _id: userId })
  }

  async dropCollection (collection) {
    if (collection === 'all') {
      for (const item of Object.keys(this.models)) {
        const result = await this.client.database.models[item].find()
        if (result.length > 0) {
          try {
            this.client.logger.warn(`[Database:dropCollection] Dropping Collection to ${item}...`)
            await this.mongo.collection(item).drop()
          } catch (e) {
            this.client.logger.error(`[Database:dropCollection] Dropping Collection an error has occurred to ${item} collection!\n${e.stack}`)
            return new Error(e)
          }
        }
      }
      return '[Database:dropCollection] Dropping all collections...'
    } else {
      if (!collection) {
        this.client.logger.error('[Database:dropCollection] collection is not provided!')
        return new Error('[Database:dropCollection] collection is not provided!')
      }
      const getModel = this.models[collection]
      if (!getModel) {
        this.client.logger.error(`[Database:dropCollection] collection is not exist! (${collection})`)
        return new Error(`[Database:dropCollection] collection is not exist! (${collection})`)
      }
      try {
        this.client.logger.warn(`[Database:dropCollection] Dropping Collection to ${getModel.modelName}...`)
        await this.mongo.collection(getModel.modelName).drop()
        return `[Database:dropCollection] Dropping Collection to ${getModel.modelName}...`
      } catch (e) {
        this.client.logger.error(`[Database:dropCollection] Dropping Collection an error has occurred to ${getModel.modelName} collection!\n${e.stack}`)
        return new Error(e)
      }
    }
  }

  async addErrorInfo (type = 'default', error, message, command, args) {
    const createUUID = uuid.v4()
    this.client.logger.error(`${this.defaultPrefix.addErrorInfo} Added ErrorInfo UUID: ${createUUID}`)
    try {
      await this.models.error({ _id: createUUID, clusterId: this.client.clusterId, type, name: error.name, stack: error.stack, authorId: message.author.id, guildId: message.guild.id, tchId: message.channel.id, command, args }).save()
    } catch (e) {
      return new DatabaseError.ModelSaveError(`${this.defaultPrefix.addErrorInfo} Failed to create errorInfo data via errorInfo UUID: ${createUUID}`)
    }
    this.client.logger.debug(`${this.defaultPrefix.addErrorInfo} Saving...`)
    return createUUID
  }

  getFormatter (...args) { return args.join('-') }
}

module.exports = Database
