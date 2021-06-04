/* eslint-disable no-unused-vars */
const { BaseCommand } = require('../../structures')
const Discord = require('discord.js')
const child = require('child_process')
const util = require('util')

class Command extends BaseCommand {
  constructor (client) {
    super(
      client,
      'compile',
      ['cmd', 'eval'],
      'BotOwner',
      ['BotOwner'],
      '<Code>',
      'Run to Code',
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
    this.dir = __filename
  }

  async run (compressed) {
    const { message, args } = compressed
    const waitReaction = await message.react(this.client.utils.constructors.EMOJI_SANDCLOCK)
    const codeToRun = args.join(' ')
    const startTime = this.getNanoSecTime()
    let endTime, messagesList
    try {
      // eslint-disable-next-line no-eval
      const evalPromise = (code) => new Promise((resolve, reject) => { try { resolve(eval(`(async () => { ${code} })()`)) } catch (e) { reject(e) } })
      const result = await Promise.race([this.timeout(15000), evalPromise(codeToRun)])
      endTime = this.getNanoSecTime() - startTime
      await message.react(this.client.utils.constructors.EMOJI_YES)
      messagesList = await this.sendOver2000(util.inspect(result, { depth: 1 }), message, { code: 'js' })
    } catch (e) {
      endTime = this.getNanoSecTime() - startTime
      await message.react(this.client.utils.constructors.EMOJI_X)
      messagesList = await this.sendOver2000(e.stack || e.message || e.name || e, message, { code: 'js' })
    } finally {
      const lastMessage = await message.channel.send(`> \`Processing Time: ${endTime}ns, ${endTime / 1000000}ms\``)
      await lastMessage.react(this.client.utils.constructors.EMOJI_X)
      try {
        const collector = await lastMessage.awaitReactions(reaction => reaction.emoji.name === this.client.utils.constructors.EMOJI_X, { max: 1, time: 15000, errors: ['time'] })
        const collected = collector.first()
        if (collected) {
          await lastMessage.delete()
          if (messagesList instanceof Array && messagesList.length !== 0) {
            for (const msg of messagesList) {
              try {
                await msg.delete()
                await this.client.wait(550)
              } catch (e) {
                this.client.logger.error(`[Commands:BotOwner:Compile] Removing Message an an error has occurred\n${e.stack}`)
              }
            }
          }
        }
      } catch (e) {
        lastMessage.reactions.removeAll()
      }
      try {
        await waitReaction.remove()
      } catch {}
    }
  }

  async timeout (time) {
    await this.client.wait(time)
    throw new Error('Execution Timed out.')
  }

  getNanoSecTime () {
    const hrTime = process.hrtime()
    return hrTime[0] * 1000000000 + hrTime[1]
  }
}

module.exports = Command
