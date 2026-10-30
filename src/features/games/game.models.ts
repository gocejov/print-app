import mongoose, { Schema } from 'mongoose'

// The kind selects an experience; participant identity and messages remain scoped to one game.
const gameSchema = new Schema(
  {
    kind: { type: String, enum: ['message-circle'], default: 'message-circle', required: true },
    name: { type: String, required: true, maxlength: 120 },
    welcome: { type: String, required: true, maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    qrCode: { type: Schema.Types.ObjectId, ref: 'qrcodes', required: true, unique: true },
  },
  { timestamps: true },
)
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
export const GameModel = mongoose.model('games', gameSchema)
export const ParticipantModel = mongoose.model('game-participants', participantSchema)
export const GameMessageModel = mongoose.model('game-messages', messageSchema)
