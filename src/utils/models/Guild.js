const { model, Schema } = require('mongoose')

const Guild = new Schema({
  _id: { type: String, required: true },
  queue: { type: Array, default: [] },
  paused: { type: Boolean, default: false },
  volume: { type: String, default: '50' },
  repeat: { type: Boolean, default: true },
  nowPlayingMessage: { type: String, default: '0' },
  nowPlayingChannel: { type: String, default: '0' },
  nowPlaying: { type: Object, default: {} },
  pinned: { type: Boolean, default: false },
  tch: { type: String, default: '0' }
}, { collection: 'guild', versionKey: false })

module.exports = {
  modelName: 'guild',
  getModel: model('guild', Guild)
}
