const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'volume',
      ['볼륨', 'v', 'qhffba', '패ㅣㅕㅡㄷ', 'vol', '패ㅣ'],
      'Audio',
      ['Everyone'],
      '<없음|볼륨(정수)>',
      '볼륨을 조절합니다.',
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
    const volume = args[0]
    if (!volume) return message.channel.send(this.client.audio.utils.getMessagesObj('CURRENT_VOLUME')(this.client.audio.players.get(message.guild.id) ? this.client.audio.players.get(message.guild.id).connection.player.dispatcher.volume * 100 : getGuild.volume))
    if (isNaN(volume) || volume.includes('-') || volume.includes('+') || volume.includes('.')) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 볼륨은 오로지 정수로만 설정 가능합니다!`)
    if (volume < 1 || volume > 150) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 볼륨을 **1%** 이상 **150%** 이하로 설정 가능합니다!`)
    if (getGuild.volumeFader) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 볼륨 페이더가 실행중입니다, 잠시 후 다시 이용해주세요!`)
    await message.channel.send(this.client.audio.utils.getMessagesObj('SET_VOLUME')(volume))
    const result = await this.client.audio.setVolume(message.guild.id, volume)
    if (this.client.debug) await message.channel.send(result.join(' ➜ '), { code: 'js' })
  }
}

module.exports = Command
