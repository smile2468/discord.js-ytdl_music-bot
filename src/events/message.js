const { BaseEvent } = require('../structures')

class Event extends BaseEvent {
  constructor (client) {
    super(
      client,
      'message',
      (...args) => this.run(...args)
    )
    this.classPrefix = '[Events:Message'
    this.defaultPrefix = {
      commandHandler: `${this.classPrefix}:CommandHandler]`,
      messageHandler: `${this.classPrefix}:MessageHandler]`
    }
    this.dir = __filename
  }

  async run (message) {
    this.commandHandler(message)
    this.messageHandler(message)
  }

  async messageHandler (message) {
    if (!message.guild || message.author.bot || message.system || message.channel.type === 'dm') return
    await this.client.database.getUser(message.author.id)
    await this.client.database.getMember(message.author.id, message.guild.id)
  }

  async commandHandler (message) {
    if (message.author.bot || message.system) return
    const { prefix } = this.client._options.bot
    const args = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase()
    const Command = this.client.commands.get(command) || this.client.commands.get(this.client.aliases.get(command))
    if (message.content.startsWith(prefix) && Command) {
      if (!Command.requirements.dmChannel && message.channel.type === 'dm') return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} Commands are not available on **DM** Channel!`)
      const getGuild = await this.client.database.getGuild(message.guild.id)
      const getUser = await this.client.database.getUser(message.author.id)
      const getMember = await this.client.database.getMember(message.author.id, message.guild.id)
      if (getGuild.tch && getGuild.tch !== '0') {
        const getChannel = message.guild.channels.cache.get(getGuild.tch)
        if (getChannel && getGuild.tch !== message.channel.id && (!this.client._options.bot.owners.includes(message.author.id) || !message.member.permissions.has('ADMINISTRATOR'))) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 해당 명령어는 **${getChannel}** 에서 사용할 수 있습니다!`)
      }
      if (this.client.debug && !this.client._options.bot.owners.includes(message.author.id)) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 현제 봇이 유지보수 상태입니다. 나중에 다시 시도해주세요.`)
      if (this.client.isReload && !this.client._options.bot.owners.includes(message.author.id)) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 봇의 구성 요소들을 리로드 중입니다. 잠시 후 이용해주세요.`)
      if (Command.requirements.voiceStatus.inVoice && !message.member.voice.channel) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 먼저 음설 채널에 입장 후, 명령어를 입력해주세요!`)
      if (Command.requirements.voiceStatus.sameChannel && (await this.client.audio.getPlayer(message.guild.id))?.vchId !== message.member.voice.channel.id) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 해당 명령어는 같은 음성 채널에 있을 때만 사용 가능한 명령어입니다!`)
      if (Command.requirements.playingStatus && (!message.guild.me.voice.channel || !(this.client.audio.getPlayer(message.guild.id)) || !(this.client.audio.getPlayer(message.guild.id))?.connection || !(await this.client.database.getGuild(message.guild.id))?.nowPlaying)) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 해당 명령어는 노래 재생 중에만 사용이 가능한 명령어입니다!`)
      if (Command.requirements.voiceStatus.listen && this.client.audio.utils.checkSelfDeaf(message.member)) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 먼저 듣기를 활성화 해주세요!`)
      if (getUser.ban && !this.client._options.bot.owners.includes(message.author.id)) {
        this.client.logger.warn(`${this.defaultPrefix.commandHandler} This user has been banned (${message.author.id})`)
        return message.delete()
      }
      let count = 0
      const permissions = this.client.permissionChecker.chkPerms(message.member)
      for (const perm of permissions) {
        if (Command.permissions.includes(perm)) {
          count++
          this.client.logger.debug(`${this.defaultPrefix.commandHandler} Execute Command to guild via guildId: ${message.guild.id} & TextChannelId: ${message.channel.id} & memberId: ${message.author.id}`)
          try {
            await Command.run({ message, args, data: { prefix, getGuild, getMember, getUser, permissions } })
          } catch (error) {
            this.client.logger.error(`${this.defaultPrefix.commandHandler} Executing Command an error occurred to ${Command.name}!\nErrorName: ${error.name}, GuildId: ${message.guild.id}, TchId: ${message.channel.id}, MessageId: ${message.id}, AuthorId: ${message.author.id}\n${error.stack}`)
            const getUUID = await this.client.database.addErrorInfo('COMMAND_ERROR', error, message, command.name, args)
            message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 이런, 알 수 없는 오류가 명령어를 실행하는데 방해해요! 아래 코드를 관리자에게 전달해주세요!\n\`오류 코드: ${getUUID}\``)
            this.client.logger.warn(`${this.defaultPrefix.commandHandler} Created UUID Code: ${getUUID}`)
          }
        }
      }
      if (count === 0) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 해당 명령어를 사용하려면 다음 권한이 필요합니다! \`${Command.permissions.join('`, `')}\``)
    }
  }
}

module.exports = Event
