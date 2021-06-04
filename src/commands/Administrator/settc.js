const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'settc',
      ['채널설정'],
      'Administrator',
      ['Administrator'],
      '<없음|텍스트채널>',
      '명령어 채널을 지정합니다.',
      false,
      {
        playingStatus: false,
        voiceStatus: {
          listen: false,
          sameChannel: false,
          inVoice: false
        },
        dmChannel: false
      }
    )
  }

  async run ({ message, args, data: { getGuild } }) {
    const opts = args[0]
    if (!opts) return message.channel.send(this.argumentNotProvided())
    const prevChannel = getGuild.tch === '0' ? '없음' : message.guild.channels.cache.get(getGuild.tch)
    if (!['없음', 'none', 'djqtdma', 'ㅜㅐㅜㄷ'].includes(opts) && !(/^[0-9]*$/.test(this.mentionId(message.mentions.channels.first() ? (message.mentions.channels.first().id ?? opts) : opts)))) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 채널의 아이디 또는 언급만 가능합니다!`)
    if (['없음', 'none', 'djqtdma', 'ㅜㅐㅜㄷ'].includes(opts)) {
      await this.client.database.updateGuild(message.guild.id, { $set: { tch: '0' } })
      return message.channel.send(`> ${this.client.utils.constructors.EMOJI_YES} 명령어 채널이${(!getGuild?.tch || getGuild.tch === '0') ? ' ' : ` **${prevChannel || '알 수 없음'}** 채널에서 `}**없음** 으로 설정되었습니다\n> 이제 모든 채널에서 명령어를 사용할 수 있습니다!`)
    }
    const getChannel = message.guild.channels.cache.get(this.mentionId(message.mentions.channels.first() ? (message.mentions.channels.first().id ?? opts) : opts))
    if (!getChannel) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 해당 채널을 찾을 수 없습니다!`)
    if (!['text'].includes(getChannel.type)) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 채널 타입은 **텍스트** 만 가능합니다!`)
    await this.client.database.updateGuild(message.guild.id, { $set: { tch: this.mentionId(message.mentions.channels.first() ? (message.mentions.channels.first().id ?? opts) : opts) } })
    await message.channel.send(`> ${this.client.utils.constructors.EMOJI_YES} 명령어 채널이${(!getGuild?.tch || getGuild.tch === '0') ? ' ' : ` **${prevChannel || '알 수 없음'}** 채널에서 `}**${getChannel || '알 수 없음'}** 으로 설정되었습니다!\n> 앞으로 이 채널에서만 명령어를 사용할 수 있습니다!`)
  }
}

module.exports = Command
