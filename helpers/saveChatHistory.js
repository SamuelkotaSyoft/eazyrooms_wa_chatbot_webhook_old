import ChatHistory from "../models/chatHistoryModel.js";
import Location from "../models/locationModel.js";

export default async function saveChatHistory({
  source,
  locationId,
  chatId,
  message,
  variable,
}) {
  return new Promise(async (resolve, reject) => {
    try {
      /**
       *
       * get property id from location id
       */

      const location = await Location.findOne({ _id: locationId });
      const propertyId = location.property;

      /**
       *
       * get existing chat history
       */
      const existingChatHistory = await ChatHistory.findOne({
        location: locationId,
        chatId: chatId,
      });


      /**
       *
       * if chat history already exists then update it
       */
      if (existingChatHistory) {
        const updateResult = await ChatHistory.updateOne(
          { location: locationId, chatId: chatId },
          {
            $set: {
              messages: message
                ? [
                    ...(existingChatHistory?.messages ?? []),
                    {
                      from: message?.from,
                      id: message?.id,
                      type: message?.type,
                      message: message?.message,
                      media: message?.media,
                      replyButtons: message?.replyButtons,
                      regex: message.regex,
                      errorMessage: message?.errorMessage,
                      variable: message?.variable,
                      timestamp: message?.timestamp,
                    },
                  ]
                : [...(existingChatHistory?.messages ?? [])],
              variables: variable
                ? { ...(existingChatHistory?.variables ?? {}), ...variable }
                : { ...(existingChatHistory?.variables ?? []) },
            },
          },
          { new: true }
        );

      } else {
        /**
         *
         * if chat history doesnt already exist then create new history
         */
        const chatHistory = new ChatHistory({
          property: propertyId,
          location: locationId,
          chatId: chatId,
          source: source,
          variables: variable ? { ...variable } : {},
          messages: message ? [{ ...message }] : [],
        });

        const writeResult = await chatHistory.save();

      }
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}
