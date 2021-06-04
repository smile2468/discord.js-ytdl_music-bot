const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'nowplaying',
      ['현재재생중', 'guswowotodwnd', 'ㅜㅐ제ㅣ묘ㅑㅜㅎ', 'np', 'ㅞ'],
      'Audio',
      ['Everyone'],
      '<없음>',
      '현재 재생 중인 곡을 보여줍니다.',
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
    const getPlayer = this.client.audio.getPlayer(message.guild.id)
    if (getPlayer && getGuild.nowPlaying) {
      const msg = await message.channel.send(await this.client.audio.utils.getNowPlayingMessage(message.guild.id))
      await msg.react(this.client.utils.constructors.EMOJI_PIN)
      await this.client.database.updateGuild(message.guild.id, { $set: { nowPlayingChannel: message.channel.id } })
      await this.client.database.updateGuild(message.guild.id, { $set: { nowPlayingMessage: msg.id } })
      await this.client.audio.utils.nowPlayingMessageUpdater(message.guild.id)
    } else {
      await message.channel.send(await this.client.audio.utils.getNowPlayingMessage(message.guild.id, true))
    }
  }
}

module.exports = Command
