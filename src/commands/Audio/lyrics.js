const { MessageEmbed } = require('discord.js')
const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'lyrics',
      ['가사', 'ㅣㅛ걏ㄴ', 'rktk'],
      'Audio',
      ['Everyone'],
      '<검색어>',
      '가사를 보여줍니다.',
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
    const opts = args.join(' ')
    if (!opts && !getGuild.nowPlaying) return message.channel.send(this.argumentNotProvided())
    else {
      if (!opts && getGuild.nowPlaying) {
        const textToArray = getGuild.nowPlaying.title.trim().replace(/(\[(?:\[??[^\\[]*?\]))/gi, '').trim().toLowerCase().replace(/mp3|download|mv|live|color coded lyrics/gi, '').trim().split('ㅣ').shift().split('|').shift().trim().replace(/\[(.*?)\]|\((.*?\))/gm, '').trim().replace(/[-’\\`~!#*$@_%+=.,^&(){}[\]|;:”<>?\\]/gm, '').trim().split(' ')
        const arr = []
        for (const item of textToArray) if (item.length >= 1) arr.push(item)
        try {
          const lyricsResult = await this.client.audio.utils.getLyrics(arr.join(' '))
          if (lyricsResult.status !== 0) return message.channel.send(this.stateReason(lyricsResult.status))
          const result = await this.lyricsEmbed(message, lyricsResult)
          result[0].setAuthor(`${lyricsResult.artist} - ${lyricsResult.title}`, null, lyricsResult.lyricsUrl)
          if (lyricsResult?.albumArt) result[0].setThumbnail(lyricsResult.albumArt)
          result[result.length - 1].setFooter('제목을 눌러 벅스에서 확인하세요!')
          for (const embed of result) await message.channel.send(embed)
          return result
        } catch (e) {
          return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 가사를 로드하는 중에 오류가 발생하였습니다!\n${this.codeBlock(this.client.debug ? e.stack : e.message, 'fix')}`)
        }
      }
      try {
        const lyricsResult = await this.client.audio.utils.getLyrics(opts)
        if (lyricsResult.status !== 0) return message.channel.send(this.stateReason(lyricsResult.status))
        const result = await this.lyricsEmbed(message, lyricsResult)
        result[0].setAuthor(`${lyricsResult.artist} - ${lyricsResult.title}`, null, lyricsResult.lyricsUrl)
        if (lyricsResult?.albumArt) result[0].setThumbnail(lyricsResult.albumArt)
        result[result.length - 1].setFooter('제목을 눌러 벅스에서 확인하세요!')
        for (const embed of result) await message.channel.send(embed)
        return result
      } catch (e) {
        return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 가사를 로드하는 중에 오류가 발생하였습니다!\n${this.codeBlock(this.client.debug ? e.stack : e.message, 'fix')}`)
      }
    }
  }

  stateReason (stateCode) {
    switch (stateCode) {
      case 1: return `> ${this.client.utils.constructors.EMOJI_NO} 성인 인증이 필요한 곡입니다, 해당 가사를 볼 수 없습니다!`
      case 2: return `> ${this.client.utils.constructors.EMOJI_NO} 검색 결과가 없습니다...`
      case 3: return `> ${this.client.utils.constructors.EMOJI_NO} 가사가 없습니다...`
      case 4: return `> ${this.client.utils.constructors.EMOJI_NO} 해당 곡의 가사는 준비중입니다!`
      default: return `> ${this.client.utils.constructors.EMOJI_NO} 알 수 없는 오류입니다!`
    }
  }

  async lyricsEmbed (message, compressed) {
    const embedList = []
    // const messageList = []
    if (compressed.lyrics.length < 1990) {
      const Embed = new MessageEmbed().setDescription(compressed.lyrics).setColor(this.client.utils.Colors.highestColor(message.guild.me)).setAuthor(`${compressed.artist} - ${compressed.title}`, null, compressed.lyricsUrl)
      embedList.push(Embed)
      // messageList.push(await message.channel.send(Embed))
      return embedList
      // return messageList
    }
    while (compressed.lyrics.length > 1990) {
      let index = compressed.lyrics.lastIndexOf('\n\n', 1990)
      if (index === -1) index = compressed.lyrics.lastIndexOf('\n', 1990)
      if (index === -1) index = compressed.lyrics.lastIndexOf(' ', 1990)
      if (index === -1) index = 1990
      const Embed = new MessageEmbed().setDescription(compressed.lyrics.substring(0, index)).setColor(this.client.utils.Colors.highestColor(message.guild.me))
      embedList.push(Embed)
      // messageList.push(await message.channel.send(Embed))
      compressed.lyrics = compressed.lyrics.substring(index).trim()
    }
    const Embed = new MessageEmbed().setDescription(compressed.lyrics).setColor(this.client.utils.Colors.highestColor(message.guild.me))
    // messageList[0].setAuthor(`${compressed.artist} - ${compressed.title}`, null, compressed.lyricsUrl)
    embedList.push(Embed)
    // messageList.push(await message.channel.send(Embed))
    // return messageList
    return embedList
  }
}

module.exports = Command
