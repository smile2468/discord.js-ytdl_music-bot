const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'stop',
      ['스탑', 's', 'tmxkq', 'ㄴ새ㅔ', 'leave', '퇴장', 'ㅣㄷㅁㅍㄷ', 'xhlwkd'],
      'Audio',
      ['Everyone'],
      '<없음>',
      '재생 중인 음악을 중지하고, 재생 목록을 초기화 합니다.',
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

  async run ({ message }) {
    try {
      await this.client.audio.stop(message.guild.id)
      await message.channel.send(`> ${this.client.utils.constructors.EMOJI_MUSIC} 재생 목록을 초기화하고 재생 중인 음악을 종료하였어요!`)
    } catch (e) {
      await message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 해당 명령어는 노래 재생 중에만 사용이 가능한 명령어입니다!`)
    }
  }
}

module.exports = Command
