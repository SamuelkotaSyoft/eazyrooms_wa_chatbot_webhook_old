import mongoose from "mongoose";

const addressSubSchema = mongoose.Schema({
  addressLine1: String,
  addressLine2: String,
  city: String,
  state: String,
  country: String,
  postCode: String,
  position: {
    lat: {
      type: Number,
    },
    lng: {
      type: Number,
    },
  },
});

export { addressSubSchema };

