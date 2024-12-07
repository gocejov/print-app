import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUserDocument } from './user.model';
import { IFileDocument } from './file.model';
import { IProductDocument } from './product.model';

// Define the interface for a QrCode document
export interface IQrCode {
  qrCode?: String;
  file: IFileDocument['_id'];
  alias?: String;
  url?: String;
  owner: IUserDocument['_id'];
  product: IProductDocument['_id'];
  createdBy: IUserDocument['_id'];
  created_at?: Date;
  updated_at?: Date;
}

// Extend Mongoose's Document interface for the QrCode schema
export interface IQrCodeDocument extends IQrCode, Document { }

// Create the QrCode schema
const QrCodeSchema: Schema<IQrCodeDocument> = new Schema({
  qrCode: { type: String, required: false },
  file: { type: String, required: true },
  alias: { type: String, required: true, default: 'c' },
  url: { type: String, required: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  created_at: { type: Date, required: true, default: new Date() },
  updated_at: { type: Date, required: true, default: new Date() },
});


QrCodeSchema.pre('save', async function (next) { // this line
  const user = this;
  user.created_at = new Date();
  user.updated_at = new Date();
  next();
});

// Define the model
export const QrCodeModel: Model<IQrCodeDocument> = mongoose.model<IQrCodeDocument>('qrcodes', QrCodeSchema);
