const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'skip',
      ['스킵', 'tmzlq', '나ㅑㅔ'],
      'Audio',
      ['Everyone'],
      '<없음>',
      '현재 재생 중인 노래를 스킵하고 다음 곡을 재생합니다.',
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
    if (getGuild.queue.length === 0) return message.channel.send(this.client.audio.utils.getMessagesObj('TRACK_SKIP_TO_NOT_ITEMS')())
    await message.channel.send(this.client.audio.utils.getMessagesObj('TRACK_SKIPPED')(getGuild.nowPlaying))
    await this.client.audio.queue.deQueue(message.guild.id, true)
    // await this.client.audio.utils.updateNowPlayingMessage(message.guild.id)
  }
}

module.exports = Command
