const { MessageEmbed, Util: { escapeMarkdown } } = require('discord.js')
const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'queue',
      ['재생목록', 'q', 'wotodahrfhr', '벼뎓', 'zb', '큐'],
      'Audio',
      ['Everyone'],
      '<없음>',
      '현재 재생 목록을 보여줍니다.',
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
    const embed = new MessageEmbed()
      .setColor(this.client.utils.Colors.highestColor(message.guild.me))
    if (getPlayer && getGuild.nowPlaying) {
      if (getGuild.queue.length >= 1) {
        const chunkTracks = await this.client.utils.ArrayUtils.chunkArray(getGuild.queue.filter(el => el).map((el, index) => {
          const requester = message.guild.members.cache.get(el.requestedBy) ?? '`알 수 없음`'
          return `**${index++ + 1}**. **${escapeMarkdown(String(el.title))}**\`[${el.isLive ? 'Live' : el.durationFormatted}]\` - ${requester}`
        }), 10)
        const page = 0
        const QueueMessage = await message.channel.send(this.getQueueMessage(getGuild), this.getQueueEmbed(message, chunkTracks, page))
        if (chunkTracks.length <= 1) return true
        const reactEmojis = [this.client.utils.constructors.EMOJI_BACKWARD, this.client.utils.constructors.EMOJI_X, this.client.utils.constructors.EMOJI_FOWARD]
        await Promise.all(reactEmojis.map(el => QueueMessage.react(el)))
        await this._controlKeys(QueueMessage, message, getGuild, reactEmojis, chunkTracks, page)
      } else if (getGuild.queue.length === 0) return this.client.commands.get('nowplaying').run({ message, data: { getGuild } })
    } else {
      embed.setTitle('**아무것도 재생 중이지 않아요!**')
      await message.channel.send(embed)
    }
  }

  getQueueEmbed (message, tracks, page = 0) {
    const embed = new MessageEmbed()
      .setColor(this.client.utils.Colors.highestColor(message.guild.me))
      .setDescription(tracks[page].join('\n'))
      .setFooter(`페이지 ${page + 1}/${tracks.length}`)
    return { embed }
  }

  getQueueMessage (getGuild) {
    const queueAudioDuration = getGuild.queue.filter(el => el).map(el => el.duration).reduce((prev, val) => prev + val)
    const nowPlaying = `${this.client.utils.constructors.EMOJI_RESET} 재생 목록: **${getGuild.queue.filter(el => el).length} 개의 노래들** \`[${this.client.utils.TimeUtils.toHHMMSS(queueAudioDuration / 1000)}]\`\n${this.client.utils.constructors.EMOJI_HEADPHONES} 현재 재생 중: **${escapeMarkdown(getGuild.nowPlaying?.title) ?? '알 수 없음'}** \`[${getGuild.nowPlaying.isLive ? 'Live' : getGuild.nowPlaying.durationFormatted}]\``
    return nowPlaying
  }

  async _controlKeys (QueueMessage, message, getGuild, reactEmojis, chunkTracks, page) {
    const filter = (reaction, user) => {
      const flag = reactEmojis.includes(reaction.emoji.name) && user.id === message.author.id
      if (flag) reaction.users.remove(user)
      return flag
    }
    try {
      const collector = await QueueMessage.awaitReactions(filter, { max: 1, time: 55000, erros: ['time'] })
      const findIndexEmoji = reactEmojis.findIndex(el => el === collector.first().emoji.name)
      switch (findIndexEmoji) {
        case 0:
          page--
          if (page < 0) page = chunkTracks.length - 1
          await QueueMessage.edit(this.getQueueMessage(getGuild), this.getQueueEmbed(message, chunkTracks, page))
          await this._controlKeys(QueueMessage, message, getGuild, reactEmojis, chunkTracks, page)
          break

        case 2:
          page++
          if (page >= chunkTracks.length) page = 0
          await QueueMessage.edit(this.getQueueMessage(getGuild), this.getQueueEmbed(message, chunkTracks, page))
          await this._controlKeys(QueueMessage, message, getGuild, reactEmojis, chunkTracks, page)
          break

        default:
          QueueMessage.reactions.removeAll()
          break
      }
    } catch (e) {}
  }
}

module.exports = Command
