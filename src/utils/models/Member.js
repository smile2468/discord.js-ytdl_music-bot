const { model, Schema } = require('mongoose')

const Member = new Schema({
  _id: { type: String, required: true },
  level: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  userName: { type: String, default: 'null' },
  guildName: { type: String, default: 'null' }
}, { collection: 'member', versionKey: false })

module.exports = {
  modelName: 'member',
  getModel: model('member', Member)
}
