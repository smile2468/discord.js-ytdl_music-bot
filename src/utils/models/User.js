const { model, Schema } = require('mongoose')

const User = new Schema({
  _id: { type: String, required: true },
  ban: { type: Boolean, default: false },
  reason: { type: String, default: 'null' }
}, { collection: 'user', versionKey: false })

module.exports = {
  modelName: 'user',
  getModel: model('user', User)
}
