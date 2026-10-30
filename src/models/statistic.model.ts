import mongoose, { Schema, Document, Model } from 'mongoose'
import { IQrCodeDocument } from './qrcode.model'

export interface IStatisticData {
  visitor?: { id?: string; method: string; confirmed?: boolean; audience?: string; reason?: string }
  browserFingerprint?: { hash: string; version: number; confidence: string }
  browser?: Record<string, unknown>
  fingerprintData?: Record<string, any>
  fingerprint?: string
  request?: { method: string; path: string; query: [string, string][]; referrer?: string }
}

// Define the interface for a QrCode document
export interface IStatistic {
  qrCode: IQrCodeDocument['_id'] | string
  campaign?: mongoose.Types.ObjectId
  product?: mongoose.Types.ObjectId
  data?: IStatisticData
  created_at?: Date
  updated_at?: Date
}

// Extend Mongoose's Document interface for the QrCode schema
export interface IStatisticDocument extends IStatistic, Document {}

// Create the QrCode schema
const statisticSchema: Schema<IStatisticDocument> = new Schema({
  qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'qrcodes', required: true },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'campaigns' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'products' },
  data: { type: Schema.Types.Mixed, required: true },
  created_at: { type: Date, required: true, default: Date.now },
  updated_at: { type: Date, required: true, default: Date.now },
})

statisticSchema.index({ qrCode: 1, 'data.visitor.id': 1, 'data.visitor.confirmed': 1 })

statisticSchema.pre('save', async function (next) {
  // this line
  if (!this.created_at) this.created_at = new Date()
  this.updated_at = new Date()
  next()
})

// Define the model
export const StatisticModel: Model<IStatisticDocument> = mongoose.model<IStatisticDocument>(
  'statistics',
  statisticSchema,
)
