import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUserDocument } from './user.model';

// Define the interface for a Product document
export interface IProduct {
  qrcode: string;
  file: File;
  alias: string;
  url: string;
  createdBy: IUserDocument['_id'];
  created_at: Date;
  updated_at: Date;
}

// Extend Mongoose's Document interface for the Product schema
export interface IProductDocument extends IProduct, Document { }

// Create the Product schema
const ProductSchema: Schema<IProductDocument> = new Schema({
  qrcode: { type: String, required: true, unique: true },
  file: { type: String, required: true },
  alias: { type: String, required: true },
  url: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  created_at: { type: Date, required: true },
  updated_at: { type: Date, required: true },
});


ProductSchema.pre('save', async function (next) { // this line
  const user = this;
  user.created_at = new Date();
  user.updated_at = new Date();
  next();
});

// Define the model
export const ProductModel: Model<IProductDocument> = mongoose.model<IProductDocument>('products', ProductSchema);
