const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'shutdown',
      ['셧다운', '노ㅕㅅ애주', 'tutekdns'],
      'BotOwner',
      ['BotOwner'],
      '<없음>',
      '봇을 종료합니다.',
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

  async run ({ message }) {
    this.client.logger.warn('[Shutdown] Shutting down...')
    await message.channel.send(`> ${this.client.utils.constructors.EMOJI_SLEEP} Shutting down...`)
    for (const player of this.client.audio.players.array()) {
      this.client.logger.debug(`[Shutdown] Stopping Player to guild via guildId: ${player.guildId}`)
      await this.client.audio.stop(player.guildId)
    }
    process.exit(0)
  }
}

module.exports = Command
