const { MessageEmbed } = require('discord.js')
const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'settings',
      ['설정', 'tjfwjd', 'ㄴㄷㅅ샤ㅜㅎㄴ'],
      'Administrator',
      ['Administrator'],
      '<없음>',
      '설정을 보여줍니다.',
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
    const audioSettings = [
      `${this.client.utils.constructors.EMOJI_REPEAT} 반복재생: **${getGuild.repeat ? '활성화' : '비활성화'}**`,
      `${this.client.utils.constructors.EMOJI_PAPER_STAND} 명령어 채널: **${!getGuild.tch || getGuild.tch === '0' ? '지정되지 않음' : message.guild.channels.cache.get(getGuild.tch) || '찾을 수 없음'}**`,
      `${this.client.utils.constructors.EMOJI_PIN} 현재 재생중 메세지 고정: **${getGuild.pinned ? '활성화' : '비활성화'}**`
    ]
    const Embed = new MessageEmbed()
      .setColor(this.client.utils.Colors.highestColor(message.guild.me))
      .addField('**노래 설정들**', audioSettings.join('\n'), true)
    //   .addField('**설정들**', '2', true)
    await message.channel.send(`${this.client.utils.constructors.EMOJI_WRENCH} **${message.guild.name}** 의 설정들`, { embed: Embed })
  }
}

module.exports = Command
