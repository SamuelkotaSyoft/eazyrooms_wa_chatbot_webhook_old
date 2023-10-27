import * as AWS from "@aws-sdk/client-s3";
import axios from "axios";
import mime from "mime-types";
import mongoose from "mongoose";
import saveChatHistory from "./saveChatHistory.js";
import { socket } from "./socket.js";

// import * as firestore from "firebase-admin/firestore";

// Set up AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  region: process.env.S3_REGION,
});

// const fb = firestore.getFirestore();

//import models
import sendNextMessage from "./sendNextMessage.js";

//import socket io send message function

export default async function continueConversation({
  locationId,
  phoneNumber,
  messages,
}) {
  try {
    /**
     *
     *
     * if incoming request from webhook is an array of messages, it means that
     * it is a message from a user and not a status update,
     * then save the message and send the next message
     */
    if (Array.isArray(messages)) {
      /**
       *
       * mongodb connection
       */
      let mongodbConnection = await mongoose.connect(
        process.env.MONGODB_CONNECTION_STRING
      );

      if (mongodbConnection) {
        console.log("Connected to mongodb");
      } else {
        console.log("mongodb connection failed");
      }

      //save media to s3

      let media = null;

      if (
        messages[0]?.image?.id ||
        messages[0]?.video?.id ||
        messages[0]?.document?.id ||
        messages[0]?.audio?.id
      ) {
        media = await new Promise(async (resolve, reject) => {
          let mediaId;
          let mimeType;
          if (messages[0]?.image?.id) {
            mediaId = messages[0]?.image?.id;
            mimeType = messages[0]?.image?.mime_type;
          }

          if (messages[0]?.video?.id) {
            mediaId = messages[0]?.video?.id;
            mimeType = messages[0]?.video?.mime_type;
          }

          if (messages[0]?.document?.id) {
            mediaId = messages[0]?.document?.id;
            mimeType = messages[0]?.document?.mime_type;
          }

          if (messages[0]?.audio?.id) {
            mediaId = messages[0]?.audio?.id;
            mimeType = messages[0]?.audio?.mime_type;
          }

          if (mediaId) {
            //get 360dialog api key
            let apiKey = process.env.WA_API_KEY;
            // await fb
            //   .collection("wa_key")
            //   .doc(uid)
            //   .get()
            //   .then((querySnapshot) => {
            //     // console.log("SNAPSHOT :>> ", querySnapshot.data());
            //     apiKey = querySnapshot.data().apiKey;
            //   })
            //   .catch((err) => {
            //     res.status(403).json(err);
            //   });

            //get media blob
            const fileContents = await axios({
              method: "get",
              url: `https://waba.360dialog.io/v1/media/${mediaId}`,
              headers: {
                "D360-API-KEY": apiKey,
              },
              responseType: "arraybuffer",
            });

            if (fileContents) {
              // console.log({
              //   fileContentsData: JSON.stringify(fileContents.data),
              // });
              // fs.writeFileSync("test.jpg", fileContents.data);

              const base64EncodedImage = Buffer.from(
                fileContents.data,
                "binary"
              ).toString("base64");

              // console.log({ buffer });
              // Generate unique filename for the file
              const filename = `${Date.now()}-${
                messages[0]?.type
              }.${mime.extension(mimeType)}`;

              // Set up the S3 upload parameters
              const params = {
                Bucket: process.env.S3_BUCKET,
                Key: `wa/${locationId}/${filename}`,
                Body: Buffer.from(base64EncodedImage, "base64"), // file data
                ContentType: mimeType,
                // ACL: "public-read", // set file permissions to public
              };

              // Upload the file to S3
              let fileUrl;
              const s3Result = await new Promise((resolve, reject) => {
                s3.upload(params, (err, data) => {
                  if (err) {
                    reject(null);
                  }

                  // Add the uploaded file's S3 URL to the request object for use in next middleware
                  fileUrl = data.Location;

                  resolve({
                    type: messages[0]?.type,
                    url: fileUrl,
                  });
                });
              });


              resolve(s3Result);
            }
          } else return null;
        });
      }

      //save chat history
      await saveChatHistory({
        locationId: locationId,
        chatId: phoneNumber,
        source: "whatsapp",
        message: {
          from: messages[0].from,
          id: messages[0].id,
          message: (() => {
            if (messages[0]?.text?.body) {
              return messages[0]?.text?.body;
            }
            if (messages[0]?.interactive?.button_reply?.title) {
              return messages[0]?.interactive?.button_reply?.title;
            }
            if (messages[0]?.interactive?.list_reply?.title) {
              return messages[0]?.interactive?.list_reply?.title;
            }
          })(),
          media: media,
          timestamp: Date.now(),
          type: messages[0]?.type,
        },
      });

      //send next message
      sendNextMessage({
        locationId: locationId,
        locationId: locationId,
        phoneNumber: phoneNumber,
      });
    }

    socket.emit("RECEIVE_WHATSAPP_MESSAGE", {
      locationId: locationId,
    });
  } catch (err) {
    /**
     *
     * log any errors
     */
  }
}
