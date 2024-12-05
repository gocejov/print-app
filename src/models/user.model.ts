import mongoose, { Schema, Document, Model } from 'mongoose';

// Define the interface for a User document
export interface IUser {
  name: string;
  email: string;
  password: string;
}

// Extend Mongoose's Document interface for the User schema
export interface IUserDocument extends IUser, Document { }

// Create the User schema
const UserSchema: Schema<IUserDocument> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Define the model
export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>('users', UserSchema);
