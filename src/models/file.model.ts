import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUserDocument } from './user.model';

// Define the interface for a File document
export interface IFile {
  type: String,
  file?: String;
  url: String;
  fieldname?: String,
  originalname?: String,
  encoding?: String,
  mimetype?: String,
  destination?: String,
  filename?: String,
  path?: String,
  size?: Number,
  baseUrl?: String,
  createdBy: IUserDocument['_id'];
  date?: Date;
  created_at?: Date;
  updated_at?: Date;
}

// Extend Mongoose's Document interface for the File schema
export interface IFileDocument extends IFile, Document { }

const isWebUrlType = function (this: IFileDocument): boolean {
  return this.type === 'web-url';
};

const requiredForUploadType = function (this: IFileDocument): boolean {
  return !isWebUrlType.call(this);
};

// Create the File schema
const FileSchema: Schema<IFileDocument> = new Schema({
  type: { type: String, required: true },
  fieldname: { type: String, required: requiredForUploadType },
  originalname: { type: String, required: requiredForUploadType },
  encoding: { type: String, required: requiredForUploadType },
  mimetype: { type: String, required: requiredForUploadType },
  destination: { type: String, required: requiredForUploadType },
  filename: { type: String, required: requiredForUploadType },
  baseUrl: { type: String, required: requiredForUploadType },
  path: { type: String, required: requiredForUploadType },
  size: { type: Number, required: requiredForUploadType },
  file: { type: String, required: requiredForUploadType },
  url: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  date: { type: Date, required: true, default: new Date() },
  created_at: { type: Date, required: true, default: new Date() },
  updated_at: { type: Date, required: true, default: new Date() },
});

FileSchema.pre('save', async function (next) { // this line
  const file = this;
  file.created_at = new Date()
  file.updated_at = new Date()
  file.date = new Date()
  next();
});

export function isIFile(file: any): file is IFileDocument {
  return file && typeof file.type === 'string';
}

// Define the model
export const FileModel: Model<IFileDocument> = mongoose.model<IFileDocument>('files', FileSchema);
