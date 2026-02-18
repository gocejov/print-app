import mongoose, { Schema, Document, Model } from 'mongoose';
var bcrypt = require('bcrypt-nodejs');

// Define the interface for a User document
export interface IUser {
  name: string;
  alias?: string;
  useAlias?: boolean;
  active?: boolean;
  lastName: string;
  email: string;
  password: string;
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
  password: { type: String, required: true },
  alias: { type: String, default: 'q' },
  useAlias: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
  created_at: { type: Date, required: true, default: new Date() },
  updated_at: { type: Date, required: true, default: new Date() }
});

// hash the password
UserSchema.methods.generateHash = function (password: String) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
UserSchema.methods.validPassword = function (password: String) {
  return bcrypt.compareSync(password, this.password);
};

UserSchema.pre('save', async function (next) { // this line
  if (!this.created_at) this.created_at = new Date();
  this.updated_at = new Date();
  next();
});

// Define the model
export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>('users', UserSchema);
