import mongoose, { Schema } from 'mongoose'

import { SpaceModel } from '../spaces/space.model'

const participantSchema = new Schema(
  {
    game: { type: Schema.Types.ObjectId, ref: 'games', required: true },
    tokenHash: { type: String, required: true, select: false },
    name: { type: String, required: true, maxlength: 60 },
    nameKey: { type: String, required: true, select: false },
    visitorId: { type: String, select: false },
  },
  { timestamps: true },
)
participantSchema.index({ game: 1, tokenHash: 1 }, { unique: true })
participantSchema.index({ game: 1, nameKey: 1 }, { unique: true })
const messageSchema = new Schema(
  {
    game: { type: Schema.Types.ObjectId, ref: 'games', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'game-participants', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'game-participants', required: true },
    kind: { type: String, enum: ['text'], default: 'text' },
    text: { type: String, required: true, maxlength: 2000 },
    requestId: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
)
messageSchema.index({ game: 1, recipient: 1, readAt: 1, _id: 1 })
messageSchema.index({ game: 1, sender: 1, requestId: 1 }, { unique: true })
export const GameModel = SpaceModel // Compatibility for existing game APIs and tests.
export const ParticipantModel = mongoose.model('game-participants', participantSchema)
export const GameMessageModel = mongoose.model('game-messages', messageSchema)
