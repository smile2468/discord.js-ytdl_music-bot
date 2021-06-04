const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'pause',
      ['일시정지', 'ㅔ면ㄷ', 'dlftlwjdwl'],
      'Audio',
      ['Everyone'],
      '<없음>',
      '현재 재생 중인 노래를 일시정지 합니다.',
      false,
      {
        playingStatus: true,
        voiceStatus: {
          listen: false,
          sameChannel: true,
          inVoice: true
        },
        dmChannel: false
      }
    )
  }

  async run ({ message, data: { getGuild } }) {
    if (getGuild.paused) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 이미 음악이 멈춰있습니다!`)
    await this.client.audio.pause(message.guild.id)
    await message.channel.send(this.client.audio.utils.getMessagesObj('TRACK_PAUSED')())
  }
}

module.exports = Command
