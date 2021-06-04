const { BaseCommand } = require('../../structures')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'remove',
      ['제거', 'wprj', 'ㄱ드ㅐㅍㄷ', 'rm', '그'],
      'Audio',
      ['Everyone'],
      '<위치>',
      '재생 목록의 <위치> 에 있는 곡을 제거합니다.',
      false,
      {
        playingStatus: true,
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
    const index = args[0]
    if (!index) return message.channel.send(this.argumentNotProvided())
    if (isNaN(index) || index.includes('-') || index.includes('+') || index.includes('.')) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 위치는 오로지 정수만 가능합니다!`)
    // if (getGuild.queue.length < index || index === 0) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} **1~${getGuild.queue.length}** 사이의 수를 입력해주세요!`)
    const arrIndex = index - 1
    if (!getGuild.queue[arrIndex]) return message.channel.send(`> ${this.client.utils.constructors.EMOJI_NO} 해당 위치에 곡이 존재하지 않습니다!`)
    if (getGuild.queue[arrIndex].requestedBy !== message.author.id) return message.channel.send(this.client.audio.utils.getMessagesObj('REMOVE_QUEUE_IN_TRACK_NOT_SAME_REQUESTER')(getGuild.queue[arrIndex], index))
    await this.client.database.updateGuild(message.guild.id, [{ $set: { queue: { $concatArrays: [{ $slice: ['$queue', arrIndex] }, { $slice: ['$queue', { $add: [1, arrIndex] }, { $size: '$queue' }] }] } } }])
    await message.channel.send(this.client.audio.utils.getMessagesObj('REMOVE_QUEUE_IN_TRACK')(getGuild.queue[arrIndex], index))
  }
}

module.exports = Command
