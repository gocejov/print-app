import mongoose, { Schema } from 'mongoose'

// Keep the original collection/model identity so existing games, QRs and memberships survive.
const schema = new Schema(
  {
    pluginId: { type: String, maxlength: 80 },
    pluginVersion: { type: Number, min: 1 },
    configuration: { type: Schema.Types.Mixed },
    kind: { type: String, default: 'message-circle' }, // Legacy plugin key.
    name: { type: String, required: true, maxlength: 120 },
    welcome: { type: String, maxlength: 1000 }, // Legacy Message Circle configuration.
    createdBy: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    qrCode: { type: Schema.Types.ObjectId, ref: 'qrcodes', required: true, unique: true },
  },
  { timestamps: true },
)
schema.index({ createdBy: 1, pluginId: 1 })
export const SpaceModel = mongoose.model('games', schema)
