const { MessageEmbed } = require('discord.js')
const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'help',
      ['도움말', 'ehdnaakf', 'ㅗ디ㅔ'],
      'General',
      ['Everyone'],
      '<명령어>',
      '도움말을 보여줍니다. <명령어> 를 입력하여 해당 명령어의 도움말을 볼 수 있습니다.',
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

  async run ({ message, args }) {
    const opts = args[0]
    if (opts) {
      const optsToLowerCase = String(opts).toLowerCase()
      const Command = this.client.commands.get(optsToLowerCase) || this.client.commands.get(this.client.aliases.get(optsToLowerCase))
      if (!Command) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 해당 명령어는 존재하지 않습니다!`)
      const Embed = new MessageEmbed()
        .setColor(this.client.utils.Colors.highestColor(message.guild.me))
        .setDescription(`${this.client.utils.constructors.EMOJI_HASH} **명령어 설명**\n${this.codeBlock(this.replaceHolder(Command.name, Command.description), 'fix')}\n${this.client.utils.constructors.EMOJI_PAPER} **명령어 사용 방법**\n${this.codeBlock(this.replaceHolder(Command.name, Command.usage), 'fix')}\n${this.client.utils.constructors.EMOJI_PIN} **명령어 단축키**\n\`${Command.aliases.join('` `')}\``)
      return message.channel.send(`> ${this.client.utils.constructors.EMOJI_ALERT} **${String(Command.name).toUpperCase()}** 명령어 도움말`, { embed: Embed })
    }
    const Embed = new MessageEmbed()
      .setColor(this.client.utils.Colors.highestColor(message.guild.me))
      .setTitle(`${this.client.user.username} 봇의 명령어들`)
    const categories = ['General', 'Audio', 'Administrator', 'BotOwner']
    const categoryToEmojiName = { General: '📃 일반', Audio: '🎵 음악', Administrator: '🔧 관리자', BotOwner: '🔒 봇 오너' }
    for (const category of categories) {
      const categoryToCommands = this.client.commands.filter(el => el.category === category).map(el => `${el.aliases[0]}<${el.name}>`)
      Embed.addField(categoryToEmojiName[category], categoryToCommands.length > 0 ? `\`${categoryToCommands.join('`, `')}\`` : '`명령어가 존재하지 않아요!`')
    }
    return message.channel.send(Embed)
  }
}

module.exports = Command
