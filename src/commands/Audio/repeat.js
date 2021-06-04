const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'repeat',
      ['반복', 'ㄱ덷ㅁㅅ', 'qksqhr'],
      'Audio',
      ['Everyone'],
      '<없음>',
      '재생 목록에 있는 모든 노래를 반복 재생합니다.',
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

  async run ({ message, data: { getGuild } }) {
    const repeat = !getGuild.repeat
    await message.channel.send(this.client.audio.utils.getMessagesObj('REPEAT_STATUS')(repeat))
    await this.client.audio.utils.toggleRepeat(message.guild.id)
  }
}

module.exports = Command
