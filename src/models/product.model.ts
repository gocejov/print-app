import mongoose, { Schema, Document, Model } from 'mongoose';

// Define the interface for a Product document
export interface IProduct {
  qrcode: string;
  movie: string;
  createdBy: IProductDocument['_id'];
  date: string;
}

// Extend Mongoose's Document interface for the Product schema
export interface IProductDocument extends IProduct, Document { }

// Create the Product schema
const ProductSchema: Schema<IProductDocument> = new Schema({
  qrcode: { type: String, required: true },
  movie: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  date: { type: String, required: true },
});

// Define the model
export const ProductModel: Model<IProductDocument> = mongoose.model<IProductDocument>('products', ProductSchema);
