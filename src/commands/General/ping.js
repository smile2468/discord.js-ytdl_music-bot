const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'ping',
      ['핑', 'vld', 'ㅔㅑㅜㅎ', '반응속도', 'latency', 'qksdmdthreh', 'ㅣㅁㅅ두쵸'],
      'General',
      ['Everyone'],
      '<없음>',
      '봇의 반응 속도를 보여줍니다.',
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
    const msg = await message.channel.send(`> ${this.client.utils.constructors.EMOJI_SANDCLOCK} 핑 측정 중 ...`)
    await msg.edit(`>>> ${this.client.utils.constructors.EMOJI_PINGPONG} **핑퐁!**\n**WebSocket**: ${this.client.ws.ping}ms\n**Message Event**: ${msg.createdTimestamp - message.createdTimestamp}ms`)
  }
}

module.exports = Command
