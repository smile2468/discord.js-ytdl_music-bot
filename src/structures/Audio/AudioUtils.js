const ytdl = require('ytdl-core')
const youtubeSearch = require('youtube-sr').default
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const id3 = require('node-id3')
const { Collection, MessageEmbed, Util: { escapeMarkdown } } = require('discord.js')
const { getAudioDurationInSeconds } = require('get-audio-duration')

const { DefaultError, AudioError } = require('../../errors')

class AudioUtils {
  constructor (client) {
    this.client = client
    this.bugsParser = this.client.bugsParser
    this.classPrefix = '[AudioUtils'
    this.defaultPrefix = {
      getTracks: `${this.classPrefix}:GetTracks]`,
      getTrack: `${this.classPrefix}:GetTrack]`,
      getPlaylist: `${this.classPrefix}:GetPlaylist]`,
      getLyrics: `${this.classPrefix}:GetLyrics]`,
      sendMessage: `${this.classPrefix}:SendMessage]`,
      checkSelfDeaf: `${this.classPrefix}:CheckSelfDeaf]`,
      toggleRepeat: `${this.classPrefix}:ToggleRepeat]`,
      playChart: `${this.classPrefix}:PlayChart]`,
      nowPlayingMessageUpdater: `${this.classPrefix}:NowPlayingMessageUpdater]`,
      updateNowPlayingMessage: `${this.classPrefix}:UpdateNowPlayingMessage]`,
      getNowPlayingMessage: `${this.classPrefix}:GetNowPlayingMessage]`
    }
    this.updateMowPlayingMessageTimer = new Collection()
    this.intervalTimeOut = 5500
  }

  async nowPlayingMessageUpdater (guildId, stop = false) {
    if (stop) {
      this.client.logger.info(`${this.defaultPrefix.nowPlayingMessageUpdater} Stopped NowPlayingMessage Upadater to guild via guildId: ${guildId} & stop: ${stop}`)
      await Promise.all([clearInterval(this.updateMowPlayingMessageTimer.get(guildId)), this.updateMowPlayingMessageTimer.delete(guildId)])
      return this.updateNowPlayingMessage(guildId, stop)
    }
    this.client.logger.info(`${this.defaultPrefix.nowPlayingMessageUpdater} Running NowPlayingMessage Updater to guild via guildId: ${guildId} & stop: ${stop}`)
    if (this.updateMowPlayingMessageTimer.get(guildId)) clearInterval(this.updateMowPlayingMessageTimer.get(guildId))
    this.updateMowPlayingMessageTimer.set(guildId, setInterval(async () => {
      const result = await this.updateNowPlayingMessage(guildId, stop)
      if (result === 'clear_timer') return Promise.all([clearInterval(this.updateMowPlayingMessageTimer.get(guildId)), this.updateMowPlayingMessageTimer.delete(guildId)])
    }, this.intervalTimeOut))
  }

  async updateNowPlayingMessage (guildId, stop = false) {
    const guildData = await this.client.database.getGuild(guildId)
    if (guildData.nowPlayingChannel === '0' || guildData.nowPlayingMessage === '0') return
    const getMessageChannel = this.client.channels.cache.get(guildData.nowPlayingChannel)
    if (!getMessageChannel) return 'clear_timer'
    const getMessage = getMessageChannel.messages.cache.get(guildData.nowPlayingMessage)
    if (!getMessage) return
    if (stop) {
      const msg = await getMessage.edit(await this.getNowPlayingMessage(guildId, stop))
      await msg.reactions.removeAll()
      return msg
    }
    if (guildData.pinned && getMessageChannel.lastMessageID !== guildData.nowPlayingMessage && !getMessage.deleted) {
      try { await getMessage.delete() } catch {}
      const msg = await getMessageChannel.send(await this.getNowPlayingMessage(guildId, stop))
      await msg.react(this.client.utils.constructors.EMOJI_PIN)
      await this.client.database.updateGuild(guildId, { $set: { nowPlayingChannel: msg.channel.id } })
      await this.client.database.updateGuild(guildId, { $set: { nowPlayingMessage: msg.id } })
    } else {
      await getMessage.edit(await this.getNowPlayingMessage(guildId, stop))
    }
  }

  async getNowPlayingMessage (guildId, stop = false) {
    const getPlayer = this.client.audio.getPlayer(guildId)
    const guildData = await this.client.database.getGuild(guildId)
    const getGuild = this.client.guilds.cache.get(guildId)
    const embed = new MessageEmbed()
      .setColor(this.client.utils.Colors.highestColor(getGuild.me))
    if (stop) {
      embed.setTitle('**아무것도 재생 중이지 않아요!**')
      return { embed }
    }
    const requester = getGuild.members.cache.get(guildData.nowPlaying.requestedBy) ?? '`알 수 없음`'
    embed.setAuthor(requester.user.tag, requester.user.avatarURL({ format: 'png', size: 4096, dynamic: true }))
      .setDescription(`**[${escapeMarkdown(guildData.nowPlaying.title)}](${guildData.nowPlaying?.url ? guildData.nowPlaying.url : `https://youtube.com/watch?v=${guildData.nowPlaying.id}`})**\n${guildData.paused ? this.client.utils.constructors.EMOJI_PAUSE : this.client.utils.constructors.EMOJI_FOWARD}${this.getProgressBar((((((getPlayer.connection.player.dispatcher.count / 1000) * 20) / 100) / (this.toSeconds(guildData.nowPlaying.durationFormatted) / 100))))} \`[${this.client.utils.TimeUtils.toHHMMSS(((getPlayer.connection.player.dispatcher.count / 1000) * 20))}/${guildData.nowPlaying.durationFormatted}]\` ${this.getVolumeEmoji(guildData.volume)} **${guildData.volume}%**`)
      .setFooter(`음악 출처: ${guildData.nowPlaying.channel.name} | ${guildData.queue.length} 곡 남음 | ${this.client.utils.constructors.EMOJI_REPEAT} 반복모드 ${guildData.repeat ? '활성화' : '비활성화'}${guildData.pinned ? ` | ${this.client.utils.constructors.EMOJI_PIN}` : ''}`)
    const getThumbnail = guildData.nowPlaying.thumbnail?.url
    if (getThumbnail) embed.setThumbnail(getThumbnail)
    return embed
  }

  async getTracks (query) {
    if (!query) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.getTracks} query is not provided!`)
    this.client.logger.debug(`${this.defaultPrefix.getTracks} Get Tracks to Query: ${query}`)
    const result = await this.youtubeToSearchMany(query)
    this.client.logger.debug(`${this.defaultPrefix.getTracks} Loaded Tracks: ${result.length}`)
    return result
  }

  async getTrack (query) {
    if (!query) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.getTrack} query is not provided!`)
    this.client.logger.debug(`${this.defaultPrefix.getTrack} Get Track to Query: ${query}`)
    if (this.vaildateUrl(query)) {
      const fetched = await fetch(encodeURI(query))
      const buffer = await fetched.buffer()
      const getMetadata = id3.read(buffer)
      const getAudioDuration = await getAudioDurationInSeconds(query)
      return {
        id: getMetadata?.title ?? 'Unknown Id',
        title: getMetadata?.title ?? 'Unknown Title',
        url: query,
        duration: getAudioDuration,
        durationFormatted: this.client.utils.TimeUtils.toHHMMSS(getAudioDuration),
        thumbnail: { id: getMetadata?.title ?? 'Unknown Id', buffer: getMetadata?.image?.imageBuffer ?? '' },
        channel: { name: query.split('/')[2] },
        isYoutube: false,
        isLive: false
      }
    } else {
      if (this.validateYouTubeUrlOrId(query)) {
        try {
          const result = await this.youtubeToSearchOne((await this.getYoutubeVideoInfo(this.getvIdfromUrl(query) ?? query))?.videoDetails.video_url ?? query)
          this.client.logger.debug(`${this.defaultPrefix.getTrack} Loaded Track: ${result.title}`)
          return result
        } catch (e) {
          this.client.audio.loadMissStack = this.client.audio.loadMissStack + 1
          this.client.logger.error(`${this.defaultPrefix.getTrack} Cloud not loaded track to ${query}\n${e.stack}`)
          throw new AudioError.CloudNotLoadResourceError(`${this.defaultPrefix.getTrack} Cloud not loaded track to ${query}\n${e.stack}`)
        }
      }
      const result = await this.youtubeToSearchOne(query)
      this.client.logger.debug(`${this.defaultPrefix.getTrack} Loaded Track: ${query}`)
      return result
    }
  }

  async getPlaylist (query) {
    if (!query) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.getPlaylist} query is not provided!`)
    this.client.logger.debug(`${this.defaultPrefix.getPlaylist} Get Playlist to Query: ${query}`)
    if (!this.validateYouTubePlaylistUrlOrId(query)) return false
    try {
      const result = await this.youtubeToSearchPlaylist(query)
      this.client.logger.debug(`${this.defaultPrefix.getPlaylist} Loaded Track to Playlist videos: ${result.videoCount}`)
      return result?.videos
    } catch (e) {
      this.client.logger.error(`${this.defaultPrefix.getPlaylist} Cloud not loaded playlist to ${query}\n${e.stack}`)
      throw new AudioError.CloudNotLoadResourceError(`${this.defaultPrefix.getPlaylist} Cloud not loaded playlist to ${query}\n${e.stack}`)
    }
  }

  async getLyrics (query) {
    if (!query) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.getLyrics} query is not provided!`)
    const fetched = await fetch(`${this.bugsParser.defaultMainPage}/search/integrated?q=${encodeURI(query)}`)
    const toText = await fetched.text()
    const $ = cheerio.load(toText)
    const notFoundQuery = $('#container > section > div > ul > li:nth-child(1)').text()
    const musicSize = $('#container > section > div > fieldset > div > table > tbody > tr > td:nth-child(2) > a > span').text()
    if (Number(musicSize.replace(/[-’\\`~!#*$@_%+=.,^&(){}[\]|;:”<>?\\]/gm, '')) === 0 || notFoundQuery.includes('검색 결과가 없습니다.')) return { status: 2 }
    const getTrackId = $('#DEFAULT0 > table > tbody').toArray()[0]?.children[1]?.attribs?.trackid
    const lyricsUrl = `${this.bugsParser.defaultMainPage}/track/${getTrackId}`
    const lyricsFetched = await fetch(lyricsUrl)
    const lyricsToText = await lyricsFetched.text()
    const $$ = cheerio.load(lyricsToText)
    const title = $$('#container > header > div > h1').text().trim()
    const albumArt = $$('#container > section.sectionPadding.summaryInfo.summaryTrack > div > div.basicInfo > div > ul > li > a > img').attr('src')
    const artist = $$('#container > section.sectionPadding.summaryInfo.summaryTrack > div > div.basicInfo > table > tbody > tr:nth-child(1) > td > a').text().split('\n').map(el => el.trim()).filter(el => el.length !== 0 && !el.includes('CONNECT 아티스트'))
    const filteredArtist = artist.length > 3 ? `${artist.splice(0, 3).map(el => el.length > 10 ? `${el.slice(0, 3).trim()}...` : el)} 외 ${artist.length} 명` : artist.join(', ')
    const slicedTitle = title.length > 200 ? `${title.slice(0, 200)} ...` : title
    const certificationGuide = $$('#container > section.sectionPadding.contents.lyrics > div > div > p > span').text()
    if (certificationGuide.includes('성인 인증')) return { status: 1, lyrics: certificationGuide, title: slicedTitle, artist: filteredArtist, lyricsUrl, albumArt }
    const preparingToLyrics = $$('#container > section.sectionPadding.contents.lyrics > div > div > p > span').text()
    if (preparingToLyrics.includes('준비 중')) return { status: 4, title: slicedTitle, artist: filteredArtist, lyricsUrl, albumArt }
    const lyrics = $$('#container > section.sectionPadding.contents.lyrics > div > div').toArray()[0]?.children[2]?.children[0]?.data ?? '가사를 읽어드릴 수 없습니다!'
    if (!lyrics) return { status: 3, title: slicedTitle, artist: filteredArtist, lyricsUrl, albumArt }
    return { status: 0, lyrics, title: slicedTitle, artist: filteredArtist, lyricsUrl, albumArt }
  }

  async playChart (guildId, locale = undefined, genre = undefined, daily = true) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.playChart} guildId is not provided!`)
    if (this.client.audio.players.get(guildId)) await this.client.audio.stop(guildId, true, false)
    if (!genre && !locale) {
      const result = this.bugsParser.ChartMusics[daily ? 'Daily' : 'Week'].map(async song => {
        try {
          const result = await this.getTrack(`${song.artist} ${song.title} audio`)
          const trackTitle = String(result.title).toLowerCase()
          if (trackTitle.includes('1시간') || trackTitle.includes('1 hour') || trackTitle.includes('loop')) {
            const TrackResult = await this.getTrack(`${song.artist} ${song.title} 가사`)
            Object.assign(TrackResult, { requestedBy: this.client.user.id })
            return TrackResult
          }
          Object.assign(result, { requestedBy: this.client.user.id })
          return result
        } catch (e) {
          const result = await this.getTrack(`${song.artist} ${song.title} audio`)
          const trackTitle = String(result.title).toLowerCase()
          if (trackTitle.includes('1시간') || trackTitle.includes('1 hour') || trackTitle.includes('loop')) {
            const TrackResult = await this.getTrack(`${song.artist} ${song.title} 가사`)
            Object.assign(TrackResult, { requestedBy: this.client.user.id })
            return TrackResult
          }
          Object.assign(result, { requestedBy: this.client.user.id })
          return result
        }
      })
      for (const track of result) await this.client.database.updateGuild(guildId, { $push: { queue: await track } })
    } else {
      const result = await this.bugsParser.GenreChartMusics[daily ? 'Daily' : 'Week'][locale].get(genre).map(async song => {
        try {
          const result = await this.getTrack(`${song.artist} ${song.title} audio`)
          const trackTitle = String(result.title).toLowerCase()
          if (trackTitle.includes('1시간') || trackTitle.includes('1 hour') || trackTitle.includes('loop')) {
            const TrackResult = await this.getTrack(`${song.artist} ${song.title} 가사`)
            Object.assign(TrackResult, { requestedBy: this.client.user.id })
            return TrackResult
          }
          Object.assign(result, { requestedBy: this.client.user.id })
          return result
        } catch (e) {
          const result = await this.getTrack(`${song.artist} ${song.title} audio`)
          const trackTitle = String(result.title).toLowerCase()
          if (trackTitle.includes('1시간') || trackTitle.includes('1 hour') || trackTitle.includes('loop')) {
            const TrackResult = await this.getTrack(`${song.artist} ${song.title} 가사`)
            Object.assign(TrackResult, { requestedBy: this.client.user.id })
            return TrackResult
          }
          Object.assign(result, { requestedBy: this.client.user.id })
          return result
        }
      })
      for (const track of result) await this.client.database.updateGuild(guildId, { $push: { queue: track } })
    }
    const getQueue = await this.client.audio.queue.getQueue(guildId)
    const filterQueue = getQueue.filter(el => el)
    const excludedTrack = getQueue.filter(el => !el)
    this.client.audio.loadMissStack = this.client.audio.loadMissStack + excludedTrack.length
    if (excludedTrack.length >= 1) await this.sendMessage(guildId, this.getMessagesObj('FILTERED_QUEUE_TRACKS')(excludedTrack))
    await this.client.database.updateGuild(guildId, { $set: { queue: filterQueue } })
    await this.client.audio.queue.playNext(guildId)
    return true
  }

  async youtubeToSearchMany (query) {
    const result = await youtubeSearch.search(query, { limit: 10 })
    if (!result || result.length <= 0) throw new Error('[AudioUtils:YoutubeToSearchMany] Search results is not found!')
    return result
  }

  async youtubeToSearchOne (query) {
    const result = await youtubeSearch.searchOne(query)
    if (!result) throw new Error('[AudioUtils:YoutubeToSearchOne] Search result is not found!')
    return result
  }

  async youtubeToSearchPlaylist (query) {
    const result = await youtubeSearch.getPlaylist(query)
    if (!result) throw new Error('[AudioUtils:YoutubeToSearchPlaylist] Search result is not found!')
    return result
  }

  getMessagesObj (type) {
    switch (type) {
      case 'TRACK_STARTED': return (track) => `> ${this.client.utils.constructors.EMOJI_MUSIC} 현재 재생 중: **${escapeMarkdown(track.title)}** \`[${track.isLive ? 'Live' : track.durationFormatted}]\``
      case 'TRACK_SKIPPED': return (track) => `> ${this.client.utils.constructors.EMOJI_MUSIC} **${escapeMarkdown(track.title)}** \`[${track.isLive ? 'Live' : track.durationFormatted}]\` 곡을 건너뛰었어요!`
      case 'TRACK_STOPPED': return () => `> ${this.client.utils.constructors.EMOJI_MUSIC} 재생 중인 노래를 중지하고, 재생 목록을 초기화했어요!`
      case 'TRACK_EXPECTION': return () => `> ${this.client.utils.constructors.EMOJI_NO} 노래를 재생하는 도중, 오류가 발생하였습니다!`
      case 'TRACK_READY': return (track) => `> ${this.client.utils.constructors.EMOJI_MUSIC} **${escapeMarkdown(track.title)}** \`[${track.isLive ? 'Live' : track.durationFormatted}]\` 이 곧 재생되요!`
      case 'TRACK_SKIP_TO_NOT_ITEMS': return () => `> ${this.client.utils.constructors.EMOJI_NO} 더이상 건너 뛸 곡이 없습니다!`
      case 'TRACK_PAUSED': return () => `> ${this.client.utils.constructors.EMOJI_MUSIC} 음악을 잠시 멈췄어요! \`${this.client._options.bot.prefix}play\` 로 다시 재생 할 수 있어요!`
      case 'TRACK_RESUMED': return (getPlayer, track) => `> ${this.client.utils.constructors.EMOJI_MUSIC} **${escapeMarkdown(track.title)}** \`[${track.isLive ? 'Live' : track.durationFormatted}]\` 곡을 ${track.isLive ? '' : `**[${this.client.utils.TimeUtils.toHHMMSS(((getPlayer.connection.player.dispatcher.count / 1000) * 20))}]** 에서 부터`} 다시 재생 할게요!`
      case 'LOAD_TRACK': return () => `> ${this.client.utils.constructors.EMOJI_SANDCLOCK} 곡 로드 중...`
      case 'ADD_QUEUE_IN_TRACK': return (track, position) => `> ${this.client.utils.constructors.EMOJI_MUSIC} **${escapeMarkdown(track.title)}** \`[${track.isLive ? 'Live' : track.durationFormatted}]\` 곡을 재생 목록 **${position}** 번에 추가했어요!`
      case 'REMOVE_QUEUE_IN_TRACK': return (track, position) => `> ${this.client.utils.constructors.EMOJI_MUSIC} **${escapeMarkdown(track.title)}** \`[${track.isLive ? 'Live' : track.durationFormatted}]\` 곡을 재생 목록 **${position}** 번에서 제거했어요!`
      case 'REMOVE_QUEUE_IN_TRACK_NOT_SAME_REQUESTER': return () => `> ${this.client.utils.constructors.EMOJI_NO} 당신은 해당 곡의 신청자가 아닙니다!`
      case 'FILTERED_QUEUE_TRACKS': return (excludedTracks) => `> ${this.client.utils.constructors.EMOJI_MUSIC} 재생목록에서 **${excludedTracks.length} 개**의 곡을 제외하였습니다!`
      case 'QUEUE_IS_EMPTY': return () => `> ${this.client.utils.constructors.EMOJI_MUSIC} 재생 목록에 노래가 없어 잠시 중지했어요!`
      case 'REPEAT_STATUS': return (repeat) => `> ${this.client.utils.constructors.EMOJI_REPEAT} 반복모드를 **${repeat ? '활성화' : '비활성화'}**하였어요!`
      case 'ALL_SONGS_FINISHED': return () => `> ${this.client.utils.constructors.EMOJI_MUSIC} 재생 목록의 노래를 모두 재생하였어요!`
      case 'CURRENT_VOLUME': return (volume) => `> ${this.getVolumeEmoji(volume)} 현재 볼륨 **${volume}%**`
      case 'SET_VOLUME': return (volume) => `> ${this.getVolumeEmoji(volume)} 볼륨이 **${volume}%** 로 변경되었어요!`
      case 'CONNECTED_VOICE_CHANNEL': return (vch) => `> ${this.client.utils.constructors.EMOJI_MUSIC} 음성 채널 **${vch}** 으로 접속하였어요!`
      case 'DISCONNECTED_VOICE_CHANNEL': return (vch) => `> ${this.client.utils.constructors.EMOJI_MUSIC} 음성 채널 **${vch}** 에서의 접속을 끊었습니다!`
      case 'VOICE_CHANNEL_MEMBERS_IS_EMPTY_TO_PAUSED': return () => `> ${this.client.utils.constructors.EMOJI_PAUSE} 음성 채널에 듣는 사용자가 없어, 잠시 음악을 중지했어요!`
      default: return () => 'Unknwon Type'
    }
  }

  async toggleRepeat (guildId) {
    if (!guildId) throw new DefaultError.NotProvidedError(`${this.defaultPrefix.toggleRepeat} guildId is not provided!`)
    const getGuild = await this.client.database.getGuild(guildId)
    const result = !getGuild.repeat
    this.client.logger.debug(`${this.defaultPrefix.toggleRepeat} ${result ? 'Enabled' : 'Disabled'} repeat to guild via guildId: ${guildId}`)
    await this.client.database.updateGuild(guildId, { $set: { repeat: result } })
    return result
  }

  async sendMessage (guildId, text) {
    const getPlayer = this.client.audio.getPlayer(guildId)
    const getTch = this.client.channels.cache.get(getPlayer?.tchId)
    if (!getPlayer || !getTch) return false
    try {
      const result = await getTch.send(text)
      return result
    } catch (e) {
      this.client.logger.error(`${this.defaultPrefix.sendMessage} Send Message an error occurred to tch via tchId: ${getPlayer.tchId}\n${e.stack}`)
    }
  }

  getVolumeEmoji (volume) {
    return volume === 0 || volume <= 20
      ? this.client.utils.constructors.EMOJI_VOLUME_NO
      : volume === 30 || volume <= 60
        ? this.client.utils.constructors.EMOJI_VOLUME_MIN
        : volume >= 70
          ? this.client.utils.constructors.EMOJI_VOLUME_MAX
          : this.client.utils.constructors.EMOJI_VOLUME_NO
  }

  getAudioTovId (vId) {
    if (!vId) throw new DefaultError.NotProvidedError('[AudioUtils:getAudioTovId] vId is not provided!')
    return ytdl(vId, { quality: 'highestaudio', highWaterMark: 1 << 25 })
  }

  async getYoutubeVideoInfo (vIdOrUrl) {
    if (!vIdOrUrl) throw new DefaultError.NotProvidedError('[AudioUtils:getYoutubeVideoInfo] vIdOrUrl is not provided!')
    const result = await ytdl.getInfo(vIdOrUrl)
    return result
  }

  checkSelfDeaf (member) {
    this.client.logger.debug(`${this.defaultPrefix.checkSelfDeaf} Checking SelfDeaf to Member via memberId: ${member.id}...`)
    if (member.voice.selfDeaf) {
      this.client.logger.debug(`${this.defaultPrefix.checkSelfDeaf} SelfDeaf is Enabled to Member via memberId: ${member.id}`)
      return member.voice.selfDeaf
    }
    return false
  }

  toSeconds (time) {
    if (!time.includes(':')) return false
    const splitedColon = time.split(':')
    if (splitedColon.length === 2) {
      const minute = Number(splitedColon[0])
      const second = Number(splitedColon[1])
      return (minute * 60) + second
    } else if (splitedColon.length === 3) {
      const hour = Number(splitedColon[0])
      const minute = Number(splitedColon[1])
      const second = Number(splitedColon[2])
      return (hour * 3600) + (minute * 60) + second
    } else {
      if (splitedColon.length === 1) return time
      return time
    }
  }

  getProgressBar (percent) {
    /**
     * Reference:
     * https://github.com/sannoob/Siru-stable/blob/master/src/structures/audio/AudioUtils.js#L296
     * https://github.com/jagrosh/MusicBot/blob/master/src/main/java/com/jagrosh/jmusicbot/utils/FormatUtil.java#L41
     */
    let str = ''
    for (let i = 0; i < 12; i++) {
      if (i === parseInt(percent * 12)) {
        str += '🔘'
      } else {
        str += '▬'
      }
    }
    return str
  }

  getvIdfromUrl (url) {
    if (!url) return undefined
    const regExp = /^.*((youtu\.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[7].length === 11) ? match[7] : undefined
  }

  validateYouTubeUrl (url) {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\?v=)([^#&?]*).*/
    const match = url.match(regExp)
    if (match && match[2].length === 11) return true
    else return false
  }

  validateYouTubeUrlOrId (query) {
    if (youtubeSearch.validate(query, 'VIDEO') || youtubeSearch.validate(query, 'VIDEO_ID') || this.validateYouTubeUrl(query)) return true
    return false
  }

  validateYouTubePlaylistUrlOrId (query) {
    if (youtubeSearch.validate(query, 'PLAYLIST') || youtubeSearch.validate(query, 'PLAYLIST_ID')) return true
    return false
  }

  vaildateUrl (query) {
    const regex = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\\/]))?/gi
    return regex.test(query)
  }
}

module.exports = AudioUtils
