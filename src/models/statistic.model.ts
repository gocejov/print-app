import mongoose, { Schema, Document, Model } from 'mongoose';
import { IQrCodeDocument } from './qrcode.model';

export interface IStatisticData {
  fingerprintData?: Record<string, any>,
  fingerprint?: string
}

// Define the interface for a QrCode document
export interface IStatistic {
  qrCode: IQrCodeDocument['_id'] | string;
  data?: IStatisticData;
  created_at?: Date;
  updated_at?: Date;
}

// Extend Mongoose's Document interface for the QrCode schema
export interface IStatisticDocument extends IStatistic, Document { }

// Create the QrCode schema
const statisticSchema: Schema<IStatisticDocument> = new Schema({
  qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'qrcodes', required: true },
  data: { type: Schema.Types.Mixed, required: true },
  created_at: { type: Date, required: true, default: Date.now },
  updated_at: { type: Date, required: true, default: Date.now },
});


statisticSchema.pre('save', async function (next) { // this line
  if (!this.created_at) this.created_at = new Date();
  this.updated_at = new Date();
  next();
});


// Define the model
export const StatisticModel: Model<IStatisticDocument> = mongoose.model<IStatisticDocument>('statistics', statisticSchema);
