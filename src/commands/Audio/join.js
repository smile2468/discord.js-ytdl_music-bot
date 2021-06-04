const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'join',
      ['접속', 'wjqthr', 'ㅓㅐㅑㅜ'],
      'Audio',
      ['Everyone'],
      '<없음>',
      '봇이 음성 채널에 접속합니다.',
      false,
      {
        playingStatus: false,
        voiceStatus: {
          listen: true,
          sameChannel: false,
          inVoice: true
        },
        dmChannel: false
      }
    )
  }

  async run ({ message }) {
    const msg = await message.channel.send(`> ${this.client.utils.constructors.EMOJI_SANDCLOCK} 음성 채널 **${message.member.voice?.channel ?? '알 수 없음'}** 에 접속 중 ...`)
    try {
      this.client.audio.setPlayer(message.guild.id, message.member.voice?.channel?.id, message.channel.id)
      await msg.edit(`> ${this.client.utils.constructors.EMOJI_MUSIC} 음성 채널 **${message.member.voice?.channel ?? '알 수 없음'}** 에 접속하였습니다!`)
    } catch (e) {
      if (e.message.includes('already')) return msg.edit(`> ${this.client.utils.constructors.EMOJI_MUSIC} 음성 채널 **${message.member.voice?.channel ?? '알 수 없음'}** 에 이미 접속되어있습니다!`)
      await msg.edit(`> ${this.client.utils.constructors.EMOJI_NO} 음성 채널 **${message.member.voice?.channel ?? '알 수 없음'}** 에 접속하는 도중, 오류가 발생하였습니다!\n${this.codeBlock(e.message, 'js')}`)
    }
  }
}

module.exports = Command
