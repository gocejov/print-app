import mongoose, { Schema, Document } from 'mongoose'

export interface CampaignEntry {
  kind: 'product' | 'category'
  target: mongoose.Types.ObjectId
}
export interface CampaignProductWeight {
  product: mongoose.Types.ObjectId
  weight: number
}
export interface ICampaignDocument extends Document {
  name: string
  description: string
  rule: 'random'
  status: 'active' | 'paused'
  entries: CampaignEntry[]
  productWeights: CampaignProductWeight[]
  createdBy: mongoose.Types.ObjectId
  created_at: Date
  updated_at: Date
}
const entrySchema = new Schema<CampaignEntry>(
  {
    kind: { type: String, enum: ['product', 'category'], required: true },
    target: { type: Schema.Types.ObjectId, required: true },
  },
  { _id: false },
)
const weightSchema = new Schema<CampaignProductWeight>({
  product: { type: Schema.Types.ObjectId, ref: 'products', required: true },
  weight: { type: Number, required: true, min: 1, max: 1000, validate: Number.isInteger },
}, { _id: false })
const schema = new Schema<ICampaignDocument>({
  name: { type: String, required: true, maxlength: 120, trim: true },
  description: { type: String, maxlength: 1000, default: '' },
  rule: { type: String, enum: ['random'], default: 'random' },
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
  entries: { type: [entrySchema], default: [] },
  productWeights: { type: [weightSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
})
export const CampaignModel = mongoose.model<ICampaignDocument>('campaigns', schema)
