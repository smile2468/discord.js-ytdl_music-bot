const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'play',
      ['재생', 'p', 'wotod', 'ㅔㅣ묘'],
      'Audio',
      ['Everyone'],
      '<검색어>',
      '봇이 검색어를 통하여 검색 후, 노래를 재생합니다.',
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

  async run ({ message, args, data: { getGuild } }) {
    const query = args.join(' ')
    const getPlayer = this.client.audio.getPlayer(message.guild.id)
    if (getPlayer && getGuild.paused && getPlayer?.paused) {
      if (!query) {
        await this.client.audio.resume(message.guild.id)
        return message.channel.send(await this.client.audio.utils.getMessagesObj('TRACK_RESUMED')(getPlayer, getGuild.nowPlaying))
      }
      if (this.client.audio.utils.validateYouTubeUrlOrId(query)) {
        if (this.client.audio.utils.validateYouTubePlaylistUrlOrId(query)) {
          try {
            const getPlaylist = await this.client.audio.utils.getPlaylist(query)
            const videoIndex = query.includes('&index=') ? Number(query.split('&index=').pop()) - 1 : 0
            const mainVideo = getPlaylist[videoIndex]
            const videoInfo = await this.client.audio.utils.getYoutubeVideoInfo(mainVideo.id)
            Object.assign(mainVideo, { requestedBy: message.author.id, isLive: videoInfo.videoDetails?.isLive ?? false, isYoutube: true })
            await this.client.audio.queue.enQueue(message.guild.id, mainVideo)
            const playlist = getPlaylist.filter(el => el.id !== mainVideo.id)
            const askPlaylistToAddQueue = await message.channel.send(`> ${this.client.utils.constructors.EMOJI_MUSIC} 해당 노래에는 **${playlist.length}** 개의 노래가 포함되어있어요! 추가하실건가요?`)
            const emojis = [this.client.utils.constructors.EMOJI_YES, this.client.utils.constructors.EMOJI_NO]
            await Promise.all(emojis.map(el => askPlaylistToAddQueue.react(el)))
            try {
              const collector = await askPlaylistToAddQueue.awaitReactions((reaction, user) => emojis.includes(reaction.emoji.name) && user.id === message.author.id, { time: 15000, max: 1, erros: ['time'] })
              const collected = collector.first()
              if (emojis[0] === collected.emoji.name) {
                await Promise.all(playlist.map(async el => {
                  const videoInfo = await this.client.audio.utils.getYoutubeVideoInfo(el.id)
                  Object.assign(el, { requestedBy: message.author.id, isLive: videoInfo.videoDetails?.isLive ?? false, isYoutube: true })
                  await this.client.database.updateGuild(message.guild.id, { $push: { queue: el } })
                  return true
                }))
                try { await askPlaylistToAddQueue.reactions.removeAll() } catch (e) {}
                return askPlaylistToAddQueue.edit(`> ${this.client.utils.constructors.EMOJI_MUSIC} 이 재생목록에 있는 **${playlist.length}** 개의 노래를 재생목록에 추가하였어요!`)
              }
              if (emojis[1] === collected.emoji.name) {
                try { await askPlaylistToAddQueue.reactions.removeAll() } catch (e) {}
                return askPlaylistToAddQueue.edit(`> ${this.client.utils.constructors.EMOJI_NO} 사용자가 작업을 중지하였어요!`)
              }
            } catch (e) {
              try { await askPlaylistToAddQueue.reactions.removeAll() } catch (e) {}
              return askPlaylistToAddQueue.edit(`> ${this.client.utils.constructors.EMOJI_NO} 시간이 초과되었어요!`)
            }
          } catch (e) {
            return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 노래를 로드하는 중에 오류가 발생하였습니다!\n${this.codeBlock(this.client.debug ? e.stack : e.message, 'fix')}`)
          }
        }
        try {
          const result = await this.client.audio.utils.youtubeToSearchOne((await this.client.audio.utils.getYoutubeVideoInfo(this.client.audio.utils.getvIdfromUrl(query) ?? query))?.videoDetails.video_url ?? query)
          const videoInfo = await this.client.audio.utils.getYoutubeVideoInfo(result.id)
          Object.assign(result, { requestedBy: message.author.id, isLive: videoInfo.videoDetails?.isLive ?? false, isYoutube: true })
          await this.client.audio.queue.enQueue(message.guild.id, result)
        } catch (e) {
          return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 노래를 로드하는 중에 오류가 발생하였습니다!\n${this.codeBlock(this.client.debug ? e.stack : e.message, 'fix')}`)
        }
      } else {
        if (this.client.audio.utils.vaildateUrl(query)) {
          try {
            const getTrack = await this.client.audio.utils.getTrack(query)
            const videoInfo = await this.client.audio.utils.getYoutubeVideoInfo(getTrack.id)
            Object.assign(getTrack, { requestedBy: message.author.id, isLive: videoInfo.videoDetails?.isLive ?? false, isYoutube: true })
            await this.client.audio.queue.enQueue(message.guild.id, getTrack)
          } catch (e) {
            return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 노래를 로드하는 중에 오류가 발생하였습니다!\n${this.codeBlock(this.client.debug ? e.stack : e.message, 'fix')}`)
          }
        } else {
          try {
            const result = await this.client.audio.utils.youtubeToSearchOne(query)
            const videoInfo = await this.client.audio.utils.getYoutubeVideoInfo(result.id)
            Object.assign(result, { requestedBy: message.author.id, isLive: videoInfo.videoDetails?.isLive ?? false, isYoutube: true })
            await this.client.audio.queue.enQueue(message.guild.id, result)
          } catch (e) {
            return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 노래를 로드하는 중에 오류가 발생하였습니다!\n${this.codeBlock(this.client.debug ? e.stack : e.message, 'fix')}`)
          }
        }
      }
      await this.client.audio.resume(message.guild.id)
      return message.channel.send(await this.client.audio.utils.getMessagesObj('TRACK_RESUMED')(getPlayer, getGuild.nowPlaying))
    }
    if (!query && (!getGuild.paused && !getPlayer?.paused)) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 검색어를 입력해주세요!`)
    if (!getPlayer) await Promise.all([this.client.audio.setPlayer(message.guild.id, message.member.voice.channel.id, message.channel.id), this.client.wait(550)])
    if (this.client.audio.utils.validateYouTubeUrlOrId(query)) {
      if (this.client.audio.utils.validateYouTubePlaylistUrlOrId(query)) {
        try {
          const getPlaylist = await this.client.audio.utils.getPlaylist(query)
          const videoIndex = query.includes('&index=') ? Number(query.split('&index=').pop()) - 1 : 0
          const mainVideo = getPlaylist[getPlaylist.length === videoIndex ? videoIndex - 1 : videoIndex]
          const videoInfo = await this.client.audio.utils.getYoutubeVideoInfo(mainVideo.id)
          Object.assign(mainVideo, { requestedBy: message.author.id, isLive: videoInfo.videoDetails?.isLive ?? false, isYoutube: true })
          await this.client.audio.queue.enQueue(message.guild.id, mainVideo)
          const playlist = getPlaylist.filter(el => el.id !== mainVideo.id)
          const askPlaylistToAddQueue = await message.channel.send(`> ${this.client.utils.constructors.EMOJI_MUSIC} 해당 노래에는 **${playlist.length}** 개의 노래가 포함되어있어요! 추가하실건가요?`)
          const emojis = [this.client.utils.constructors.EMOJI_YES, this.client.utils.constructors.EMOJI_NO]
          await Promise.all(emojis.map(el => askPlaylistToAddQueue.react(el)))
          try {
            const collector = await askPlaylistToAddQueue.awaitReactions((reaction, user) => emojis.includes(reaction.emoji.name) && user.id === message.author.id, { time: 15000, max: 1, erros: ['time'] })
            const collected = collector.first()
            if (emojis[0] === collected.emoji.name) {
              await Promise.all(playlist.map(async el => {
                const videoInfo = await this.client.audio.utils.getYoutubeVideoInfo(el.id)
                Object.assign(el, { requestedBy: message.author.id, isLive: videoInfo.videoDetails?.isLive ?? false, isYoutube: true })
                await this.client.database.updateGuild(message.guild.id, { $push: { queue: el } })
                return true
              }))
              try { await askPlaylistToAddQueue.reactions.removeAll() } catch (e) {}
              return askPlaylistToAddQueue.edit(`> ${this.client.utils.constructors.EMOJI_MUSIC} 이 재생목록에 있는 **${playlist.length}** 개의 노래를 재생목록에 추가하였어요!`)
            }
            if (emojis[1] === collected.emoji.name) {
              try { await askPlaylistToAddQueue.reactions.removeAll() } catch (e) {}
              return askPlaylistToAddQueue.edit(`> ${this.client.utils.constructors.EMOJI_NO} 사용자가 작업을 중지하였어요!`)
            }
          } catch (e) {
            try { await askPlaylistToAddQueue.reactions.removeAll() } catch (e) {}
            return askPlaylistToAddQueue.edit(`> ${this.client.utils.constructors.EMOJI_NO} 시간이 초과되었어요!`)
          }
        } catch (e) {
          return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 노래를 로드하는 중에 오류가 발생하였습니다!\n${this.codeBlock(this.client.debug ? e.stack : e.message, 'fix')}`)
        }
      }
      try {
        const result = await this.client.audio.utils.youtubeToSearchOne((await this.client.audio.utils.getYoutubeVideoInfo(this.client.audio.utils.getvIdfromUrl(query) ?? query))?.videoDetails.video_url ?? query)
        const videoInfo = await this.client.audio.utils.getYoutubeVideoInfo(result.id)
        Object.assign(result, { requestedBy: message.author.id, isLive: videoInfo.videoDetails?.isLive ?? false, isYoutube: true })
        return this.client.audio.queue.enQueue(message.guild.id, result)
      } catch (e) {
        return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 노래를 로드하는 중에 오류가 발생하였습니다!\n${this.codeBlock(this.client.debug ? e.stack : e.message, 'fix')}`)
      }
    } else {
      if (this.client.audio.utils.vaildateUrl(query)) {
        try {
          const getTrack = await this.client.audio.utils.getTrack(encodeURI(query))
          Object.assign(getTrack, { requestedBy: message.author.id, isLive: false, isYoutube: false })
          return this.client.audio.queue.enQueue(message.guild.id, getTrack)
        } catch (e) {
          return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 노래를 로드하는 중에 오류가 발생하였습니다!\n${this.codeBlock(this.client.debug ? e.stack : e.message, 'fix')}`)
        }
      }
      try {
        const result = await this.client.audio.utils.youtubeToSearchOne(query)
        const videoInfo = await this.client.audio.utils.getYoutubeVideoInfo(result.id)
        Object.assign(result, { requestedBy: message.author.id, isLive: videoInfo.videoDetails?.isLive ?? false, isYoutube: true })
        await this.client.audio.queue.enQueue(message.guild.id, result)
      } catch (e) {
        return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 노래를 로드하는 중에 오류가 발생하였습니다!\n${this.codeBlock(this.client.debug ? e.stack : e.message, 'fix')}`)
      }
    }
  }
}

module.exports = Command
