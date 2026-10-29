import mongoose, { Schema, Document, Model } from 'mongoose';
import { hashPassword } from '../utils/password.utils';

// Define the interface for a User document
export interface IUser {
  name: string;
  alias?: string;
  useAlias?: boolean;
  active?: boolean;
  lastName: string;
  email: string;
  password: string;
  authVersion?: number;
  created_at?: Date;
  updated_at?: Date;
}

// Extend Mongoose's Document interface for the User schema
export interface IUserDocument extends IUser, Document { }

// Create the User schema
const UserSchema: Schema<IUserDocument> = new Schema({
  name: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  authVersion: { type: Number, default: 0, select: true },
  alias: { type: String, default: 'q' },
  useAlias: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
  created_at: { type: Date, required: true, default: Date.now },
  updated_at: { type: Date, required: true, default: Date.now }
});

// Defense in depth: exclude password hashes even on freshly saved documents.
UserSchema.set('toJSON', { transform: (_doc, ret) => { delete ret.password; return ret; } });
UserSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await hashPassword(this.password);
  if (!this.created_at) this.created_at = new Date();
  this.updated_at = new Date();
});

// Define the model
export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>('users', UserSchema);
