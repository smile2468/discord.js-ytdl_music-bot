const { Schema, model } = require('mongoose')

const Error = new Schema({
  _id: { type: String },
  clusterId: { type: String, default: '0' },
  type: { type: String, default: 'default' },
  name: { type: String, default: 'null' },
  stack: { type: String, default: 'null' },
  authorId: { type: String, default: '0' },
  guildId: { type: String, default: '0' },
  tchId: { type: String, default: '0' },
  command: { type: String, default: 'null' },
  args: { type: Array, default: [] }
}, { collection: 'error', versionKey: false })

module.exports = {
  modelName: 'error',
  getModel: model('error', Error)
}
