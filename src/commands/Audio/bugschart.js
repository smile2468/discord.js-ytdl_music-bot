const { MessageEmbed } = require('discord.js')
const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'bugschart',
      ['벅스차트', 'qjrtmckxm', 'ㅠㅕㅎㄴ촘ㄳ'],
      'Audio',
      ['Everyone'],
      '<장르>',
      '벅스 차트를 보여줍니다.',
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

  async run ({ message, args, data: { prefix } }) {
    const genre = args[0]
    const opts = args[1]
    if ((!genre || (genre && genre === '주간'))) {
      const top100Musics = this.client.audio.utils.bugsParser.ChartMusics[genre === '주간' ? 'Week' : 'Daily']
      const chunkTracks = await this.client.utils.ArrayUtils.chunkArray(top100Musics, 15)
      let num = 1
      const obj = {}
      for (const track of chunkTracks) obj[`PAGE-${num++}`] = track.map(el => `**[${el.index}](${el.link})**`)
      for (const key in obj) {
        const keys = Object.keys(obj)
        const firstKey = keys.shift()
        const lastKey = keys.pop()
        const Embed = new MessageEmbed()
          .setColor(this.client.utils.Colors.highestColor(message.guild.me))
        if (firstKey === key) Embed.setTitle(`벅스 ${genre === '주간' ? '주간' : '일간'} 차트 TOP 100`)
        if (!genre && lastKey === key) Embed.setFooter(`주간 차트가 보고싶으시다면, '${prefix}${this.aliases[0]} 주간' 명령어를 사용하여 확인할 수 있습니다!`)
        if (genre && genre === '주간' && lastKey === key) Embed.setFooter(`일간 차트가 보고싶으시다면, '${prefix}${this.aliases[0]}' 명령어를 사용하여 확인할 수 있습니다!`)
        Embed.setDescription(obj[key].join('\n'))
        await message.channel.send(Embed)
        await this.client.wait(1000)
      }
    } else if (genre && genre !== '주간') {
      let count = 0
      const arr = []
      for (const key in this.client.audio.utils.bugsParser.GenreCharts) {
        for (const element of this.client.audio.utils.bugsParser.filterGenreList(this.client.audio.utils.bugsParser.GenreCharts[key])) {
          Object.assign(element, { locale: key })
          if (element.ko.includes(genre)) {
            count++
            arr.push(element)
          }
        }
      }
      if (arr.length > 1) {
        const Embed = new MessageEmbed()
          .setColor(this.client.utils.Colors.highestColor(message.guild.me))
        let string = ''
        let index = 1
        let num = 1
        const obj = {}
        for (const item of arr) string += `**${index++}. ${this.client.audio.utils.bugsParser.getGenreLocaleToKo(item.locale)} - ${item.ko}(${item.en})**\n`
        Embed.setDescription(string)
          .setTitle('원하시는 장르의 번호를 입력해주세요!')
          .setFooter('\'취소\' 를 입력하여 작업을 취소할 수 있어요!')
        const msg = await message.channel.send(`> ${this.client.utils.constructors.EMOJI_SEARCH} **${genre} 장르** 검색 결과 \`[중복결과 ${arr.length} 개]\``, { embed: Embed })
        try {
          const collector = await msg.channel.awaitMessages(async (m) => {
            const result = ((arr.length >= Number(m.content) && Number(m.content) !== 0 && !isNaN(m.content)) || m.content === '취소') && !m.author.bot && m.author.id === message.author.id
            if (result) {
              await m.delete()
              await msg.delete()
            }
            return result
          }, { max: 1, time: 15000, errors: ['time'] })
          const collected = collector.first()
          if (collected.content === '취소') return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 사용자가 작업을 중지하였어요!`)
          const collectedNum = Number(collected.content)
          const collectedGenre = arr[collectedNum - 1]
          const top100Musics = this.client.audio.utils.bugsParser.GenreChartMusics[opts === '주간' ? 'Week' : 'Daily'][collectedGenre.locale].get(collectedGenre.en)
          const chunkTracks = await this.client.utils.ArrayUtils.chunkArray(top100Musics, 15)
          for (const track of chunkTracks) obj[`PAGE-${num++}`] = track.map(el => `**[${el.index}](${el.link})**`)
          for (const key in obj) {
            const keys = Object.keys(obj)
            const firstKey = keys.shift()
            const lastKey = keys.pop()
            const embed = new MessageEmbed()
              .setColor(this.client.utils.Colors.highestColor(message.guild.me))
            if (firstKey === key) embed.setTitle(`벅스 ${this.client.audio.utils.bugsParser.getGenreLocaleToKo(collectedGenre.locale)} ${collectedGenre.ko} ${opts === '주간' ? '주간' : '일간'} 차트 TOP 100`)
            if (!opts && lastKey === key) embed.setFooter(`주간 차트가 보고싶으시다면, '${prefix}${this.aliases[0]} ${collectedGenre.ko} 주간' 명령어를 사용하여 확인할 수 있습니다!`)
            if (opts && opts === '주간' && lastKey === key) embed.setFooter(`일간 차트가 보고싶으시다면, '${prefix}${this.aliases[0]} ${collectedGenre.ko}' 명령어를 사용하여 확인할 수 있습니다!`)
            embed.setDescription(obj[key].join('\n'))
            await message.channel.send(embed)
            await this.client.wait(1000)
          }
          return obj
        } catch (e) {
          await message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 선택 시간이 초과되었어요!`)
        }
      } else if (arr.length === 1) {
        let num = 1
        const obj = {}
        const collectedGenre = arr[0]
        const top100Musics = this.client.audio.utils.bugsParser.GenreChartMusics[opts === '주간' ? 'Week' : 'Daily'][collectedGenre.locale].get(collectedGenre.en)
        const chunkTracks = await this.client.utils.ArrayUtils.chunkArray(top100Musics, 15)
        for (const track of chunkTracks) obj[`PAGE-${num++}`] = track.map(el => `**[${el.index}](${el.link})**`)
        for (const key in obj) {
          const keys = Object.keys(obj)
          const firstKey = keys.shift()
          const lastKey = keys.pop()
          const embed = new MessageEmbed()
            .setColor(this.client.utils.Colors.highestColor(message.guild.me))
          if (firstKey === key) embed.setTitle(`벅스 ${this.client.audio.utils.bugsParser.getGenreLocaleToKo(collectedGenre.locale)} ${collectedGenre.ko} ${opts === '주간' ? '주간' : '일간'} 차트 TOP 100`)
          if (!opts && lastKey === key) embed.setFooter(`주간 차트가 보고싶으시다면, '${prefix}${this.aliases[0]} ${collectedGenre.ko} 주간' 명령어를 사용하여 확인할 수 있습니다!`)
          if (opts && opts === '주간' && lastKey === key) embed.setFooter(`일간 차트가 보고싶으시다면, '${prefix}${this.aliases[0]} ${collectedGenre.ko}' 명령어를 사용하여 확인할 수 있습니다!`)
          embed.setDescription(obj[key].join('\n'))
          await message.channel.send(embed)
          await this.client.wait(1000)
        }
        return obj
      }
      if (count === 0) {
        let string = ''
        for (const key in this.client.audio.utils.bugsParser.GenreCharts) string += `**${this.client.audio.utils.bugsParser.getGenreLocaleToKo(key)}**\n${this.codeBlock('\'' + this.client.audio.utils.bugsParser.filterGenreList(this.client.audio.utils.bugsParser.GenreCharts[key]).map(el => el.ko).join('\', \'') + '\'', 'js')}\n`
        await message.channel.send(this.argumentNotProvided())
        await message.channel.send(string)
        return false
      }
    }
  }
}

module.exports = Command
