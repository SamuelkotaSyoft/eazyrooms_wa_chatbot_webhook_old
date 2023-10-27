import mongoose from "mongoose";

const chatHistorySchema = mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Property",
  },

  location: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Location",
  },

  chatId: {
    type: String,
  },

  source: {
    type: String,
    enum: ["whatsapp", "livechat"],
  },

  variables: {
    type: Object,
  },

  messages: [
    {
      type: Object,
    },
  ],
});

// name. email, pneon

export default mongoose.model("ChatHistory", chatHistorySchema);
