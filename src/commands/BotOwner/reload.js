const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'reload',
      ['리로드', 'ㄹㄹㄷ', 'flfhem', 'ㄱ디ㅐㅁㅇ', 'ffe'],
      'BotOwner',
      ['BotOwner'],
      '<없음>',
      '봇의 필요한 구성 요소들을 리로드합니다.',
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
    this.dir = __filename
  }

  async run ({ message, args }) {
    const opts = args[0]
    const msg = await message.channel.send(`> ${this.client.utils.constructors.EMOJI_SANDCLOCK} Reloading Client... \`BugsParser: ${opts === '--bugs-parser'} | ClearedDebrisAudio: ${opts === '--cleared-debris-audio'}\``)
    try {
      await this.client.reload(opts === '--bugs-parser', opts === '--cleared-debris-audio')
      await msg.edit(`> ${this.client.utils.constructors.EMOJI_YES} Reloaded at Client! \`BugsParser: ${opts === '--bugs-parser'} | ClearedDebrisAudio: ${opts === '--cleared-debris-audio'}\``)
    } catch (e) {
      this.client.logger.error(`[Client:Reload] Reloading at Client an error occurred!\n${e.stack}`)
      await msg.edit(`> ${this.client.utils.constructors.EMOJI_WARN} Reloading at Client an error occurred! \`${e.name}\``)
      if (this.client.debug) await message.channel.send(e.stack, { code: 'js' })
    }
  }
}

module.exports = Command
