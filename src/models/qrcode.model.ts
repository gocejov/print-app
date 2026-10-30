import mongoose, { Schema, Document, Model } from 'mongoose'
import { IUserDocument } from './user.model'
import { IFileDocument } from './file.model'
import { IProductDocument } from './product.model'

export interface IVisitorTarget {
  visitorId: string
  productId: string
}

// Define the interface for a QrCode document
export interface IQrCode {
  visitorTarget?: IVisitorTarget
  name?: string
  status?: 'active' | 'paused'
  destinationUrl?: string
  qrCode?: string
  file?: IFileDocument['_id']
  alias?: string
  url?: string
  owner: IUserDocument['_id']
  product?: IProductDocument['_id']
  campaign?: mongoose.Types.ObjectId
  createdBy: IUserDocument['_id']
  created_at?: Date
  updated_at?: Date
}

// Extend Mongoose's Document interface for the QrCode schema
export interface IQrCodeDocument extends IQrCode, Document {}

// Create the QrCode schema
const QrCodeSchema: Schema<IQrCodeDocument> = new Schema({
  visitorTarget: {
    type: new Schema(
      {
        visitorId: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
      },
      { _id: false },
    ),
    default: undefined,
  },
  name: { type: String, maxlength: 120, trim: true },
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
  destinationUrl: { type: String },
  qrCode: { type: String, required: false },
  file: { type: String },
  alias: { type: String, required: true, default: 'c' },
  url: { type: String, required: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'products' },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'campaigns' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  created_at: { type: Date, required: true, default: Date.now },
  updated_at: { type: Date, required: true, default: Date.now },
})

QrCodeSchema.pre('validate', function () {
  if (!!this.product === !!this.campaign)
    this.invalidate('product', 'Choose exactly one product or campaign')
  if (this.product && !this.file) this.invalidate('file', 'A product QR requires a file')
})

QrCodeSchema.pre('save', async function (next) {
  // this line
  if (!this.created_at) this.created_at = new Date()
  this.updated_at = new Date()
  next()
})

// Define the model
export const QrCodeModel: Model<IQrCodeDocument> = mongoose.model<IQrCodeDocument>(
  'qrcodes',
  QrCodeSchema,
)
