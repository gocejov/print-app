import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUserDocument } from './user.model';

// Define the interface for a File document
export interface IFile {
  type: String,
  file: String;
  url: String;
  fieldname: String,
  originalname: String,
  encoding: String,
  mimeptype: String,
  destination: String,
  filename: String,
  path: String,
  size: Number,
  createdBy: IUserDocument['_id'];
  date: Date;
  created_at: Date;
  updated_at: Date;
}

// Extend Mongoose's Document interface for the File schema
export interface IFileDocument extends IFile, Document { }

// Create the File schema
const FileSchema: Schema<IFileDocument> = new Schema({
  type: { type: String, required: true },
  fieldname: { type: String, required: true },
  originalname: { type: String, required: true },
  encoding: { type: String, required: true },
  mimeptype: { type: String, required: true },
  destination: { type: String, required: true },
  filename: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  file: { type: String, required: true },
  url: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  date: { type: Date, required: true },
  created_at: { type: Date, required: true },
  updated_at: { type: Date, required: true },
});

FileSchema.pre('save', async function (next) { // this line
  const file = this;
  file.created_at = new Date()
  file.updated_at = new Date()
  file.date = new Date()
  next();
});


// Define the model
export const FileModel: Model<IFileDocument> = mongoose.model<IFileDocument>('files', FileSchema);
