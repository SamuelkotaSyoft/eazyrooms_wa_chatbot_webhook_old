import mongoose from "mongoose";
import { emailAddressRegex } from "../helpers/regex.js";
import { addressSubSchema } from "./addressSubSchema.js";

const guestSchema = mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Location",
  },
  name: {
    type: String,
  },
  email: {
    type: String,
    match: emailAddressRegex,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  isChild: {
    type: Boolean,
    required: false,
  },
  age: {
    type: Number,
    required: false,
  },
  kycDoc: {
    type: [String],
    required: false,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other", "preferNoToSay"],
  },
  address: {
    type: addressSubSchema,
  },
  image: {
    type: String,
    required: false,
  },
  status: {
    type: Boolean,
  },
  active: {
    type: Boolean,
    default: true,
  },
  uid: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Guest",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Guest",
  },
  arrivingFrom: {
    type: String,
  },
  goingTo: {
    type: String,
  },
  purposeOfVisit: {
    type: String, // Business / Leisure
  },
  specialInstructions: {
    type: String,
  },
  acceptedPrecheckinTerms: {
    type: Boolean,
  },
});
export default mongoose.model("Guest", guestSchema);
