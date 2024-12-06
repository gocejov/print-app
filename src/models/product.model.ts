import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser, IUserDocument } from './user.model';
import { IFile, IFileDocument } from './file.model';

// Define the interface for a Product document
export interface IProduct {
  qrcode: String;
  file: IFileDocument['_id'];
  alias?: String;
  url: String;
  owner: IUserDocument['_id'];
  createdBy: IUserDocument['_id'];
  created_at?: Date;
  updated_at?: Date;
}

// Extend Mongoose's Document interface for the Product schema
export interface IProductDocument extends IProduct, Document {
  file: IFile;
  createdBy: IUser;
  owner: IUser;
}

// Create the Product schema
const ProductSchema: Schema<IProductDocument> = new Schema({
  qrcode: { type: String, required: true, unique: true },
  file: { type: mongoose.Schema.Types.ObjectId, ref: 'files', required: true },
  alias: { type: String, required: true, default: 'c' },
  url: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  created_at: { type: Date, required: true, default: new Date() },
  updated_at: { type: Date, required: true, default: new Date() },
});


ProductSchema.pre('save', async function (next) { // this line
  const user = this;
  user.created_at = new Date();
  user.updated_at = new Date();
  next();
});

// Define the model
export const ProductModel: Model<IProductDocument> = mongoose.model<IProductDocument>('products', ProductSchema);
