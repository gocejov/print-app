import mongoose, { Schema } from 'mongoose'

// Owner-managed metadata, separate from immutable scan evidence and browser identity.
const schema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    visitorId: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    name: { type: String, required: true, maxlength: 120 },
  },
  { timestamps: true },
)
schema.index({ owner: 1, visitorId: 1 }, { unique: true })
export const VisitorLabelModel = mongoose.model('visitor-labels', schema)
