const { MessageEmbed, Util: { escapeMarkdown } } = require('discord.js')
const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'search',
      ['검색', 'rjator', 'ㄴㄷㅁㄱ초'],
      'Audio',
      ['Everyone'],
      '<검색어>',
      '검색어를 통해 유튜브에서 검색합니다.',
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

  async run ({ message, args, data: { getGuild }, commandToPlay }) {
    const query = args.join(' ')
    if (!query) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 검색어를 입력해주세요!`)
    const getPlayer = this.client.audio.getPlayer(message.guild.id)
    if (!getPlayer) this.client.audio.setPlayer(message.guild.id, message.member.voice.channel.id, message.channel.id)
    await message.delete()
    const msg = await message.channel.send(`> ${this.client.utils.constructors.EMOJI_SANDCLOCK} **${query}** 를 통해 유튜브에서 검색 중...`)
    const searchResult = await this.client.audio.utils.getTracks(query)
    const tracks = searchResult
    if (tracks.length <= 0) return msg.edit(`> ${this.client.utils.constructors.EMOJI_NO} 검색결과가 없습니다!`)
    await msg.edit(`> ${this.client.utils.constructors.EMOJI_SEARCH} **유튜브** 에서 검색된 **${query}** 의 결과들`, { embed: this.tracksToEmbed(message, tracks) })
    try {
      const collector = await msg.channel.awaitMessages(async (m) => {
        const result = ((tracks.length >= Number(m.content) && Number(m.content) !== 0 && !isNaN(m.content)) || m.content === '취소') && !m.author.bot && m.author.id === message.author.id
        if (result) {
          await m.delete()
          await msg.delete()
        }
        return result
      }, { max: 1, time: 15000, errors: ['time'] })
      const collected = collector.first()
      if (collected.content === '취소') return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 사용자가 작업을 중지하였어요!`)
      const collectedNum = Number(collected.content)
      const collectedTrack = tracks[collectedNum - 1]
      const videoInfo = await this.client.audio.utils.getYoutubeVideoInfo(collectedTrack.id)
      Object.assign(collectedTrack, { requestedBy: message.author.id, isLive: videoInfo.videoDetails?.isLive ?? false, isYoutube: true })
      await this.client.audio.queue.enQueue(message.guild.id, collectedTrack)
      if (!commandToPlay && getPlayer && getGuild.paused && getPlayer.paused) {
        await this.client.audio.resume(message.guild.id)
        await message.channel.send(this.client.audio.utils.getMessagesObj('TRACK_RESUMED')(getGuild.nowPlaying))
      }
    } catch (e) {
      await msg.delete()
      await message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 선택 시간이 초과되었어요!`)
    }
  }

  tracksToEmbed (message, tracks) {
    let trackNum = 1
    const mappingTracks = tracks.map(el => `\`${trackNum++}.\` **${escapeMarkdown(`${String(el.title).length > 80 ? `${String(el.title).substr(0, 70)}...` : el.title}`)}**`)
    return new MessageEmbed()
      .setColor(this.client.utils.Colors.highestColor(message.guild.me))
      .setTitle('원하는 트랙의 번호를 입력해주세요!')
      .setDescription(mappingTracks.join('\n'))
      .setFooter('\'취소\' 를 입력하여 작업을 취소할 수 있어요!')
  }

  tracksToMarkdown (tracks) {
    let trackNum = 1
    const mappingTracks = tracks.map(el => `${trackNum++}. \`${escapeMarkdown(`${String(el.title).length > 80 ? `${String(el.title).substr(0, 70)}...` : el.title}`)}\``)
    return mappingTracks.join('\n') + '\n' + `>>> ${this.codeBlock('# 원하는 트랙의 번호를 입력해주세요.', 'md')}`
  }
}

module.exports = Command
