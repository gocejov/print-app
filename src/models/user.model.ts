import mongoose, { Schema, Document, Model } from 'mongoose';
var bcrypt = require('bcrypt-nodejs');

// Define the interface for a User document
export interface IUser {
  name: string;
  lastName: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

// Extend Mongoose's Document interface for the User schema
export interface IUserDocument extends IUser, Document { }

// Create the User schema
const UserSchema: Schema<IUserDocument> = new Schema({
  name: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
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
  const user = this;
  user.created_at = new Date();
  user.updated_at = new Date();
  next();
});

// Define the model
export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>('users', UserSchema);
