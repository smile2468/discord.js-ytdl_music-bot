const { model, Schema } = require('mongoose')

const Bot = new Schema({
  _id: {
    type: String,
    required: true
  }
}, { collection: 'bot', versionKey: false })

module.exports = {
  modelName: 'bot',
  getModel: model('bot', Bot)
}
