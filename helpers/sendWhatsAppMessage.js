import axios from "axios";
import { fileTypeFromBuffer } from "file-type";
// import * as fs from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";

// const fb = fs.getFirestore();

export default async function sendWhatsAppMessage({
  message,
  media,
  messageType,
  phoneNumber,
  replyButtons,
  variables,
  listOptions,
}) {
  return new Promise(async (resolve, reject) => {
    let request = null;

    if (!messageType) {
      return;
    }

    if (!phoneNumber) {
      return;
    }

    /**
     *
     *  if message type is textMessageNode then send a plain text message
     */
    if (messageType === "textMessageNode" || messageType === "validation") {
      request = {
        recipient_type: "individual",
        to: phoneNumber,
        type: "text",
        text: {
          body: (() => {
            let msg = message;
            if (variables) {
              Object.keys(variables).forEach((key) => {
                msg = msg.replace(`{{${key}}}`, variables?.[`${key}`]);
              });
            }
            return msg;
          })(),
        },
      };
    }

    /**
     *
     *  if message type is textMessageNode then send a link
     */
    if (messageType === "linkNode") {
      request = {
        recipient_type: "individual",
        to: phoneNumber,
        preview_url: true,
        type: "text",
        text: {
          body: (() => {
            let msg = message;
            if (variables) {
              Object.keys(variables).forEach((key) => {
                msg = msg.replace(`{{${key}}}`, variables?.[`${key}`]);
              });
            }
            return msg;
          })(),
        },
      };
    }

    //send an image
    if (messageType === "imageNode") {
      request = {
        recipient_type: "individual",
        to: phoneNumber,
        type: "image",
        image: {
          link: media.url,
        },
      };
    }

    //send a video
    if (messageType === "videoNode" || messageType === "audioNode") {
      let apiKey = process.env.WA_API_KEY;
      let mediaId;

      try {
        //   await fb
        //     .collection("wa_key")
        //     .doc(uid)
        //     .get()
        //     .then((querySnapshot) => {
        //       // console.log("SNAPSHOT :>> ", querySnapshot.data());
        //       apiKey = querySnapshot.data().apiKey;
        //     })
        //     .catch((err) => {
        //       res.status(403).json(err);
        //     });

        const fileContents = await axios.get(media.url, {
          responseType: "arraybuffer",
        });

        const buffer = Buffer.from(fileContents.data, "buffer");

        const fileTypeBuffer = await fileTypeFromBuffer(buffer);

        const mime = fileTypeBuffer.mime;
        await axios
          .post(
            "https://waba.360dialog.io/v1/media/",
            Buffer.from(buffer, "buffer"),
            {
              headers: {
                "D360-API-KEY": apiKey,
                "Content-Type": mime,
              },
            }
          )
          .then((response) => {
            mediaId = response.data.media[0].id;
          })
          .catch((error) => {});
      } catch (err) {
        return;
      }

      request =
        messageType === "videoNode"
          ? {
              recipient_type: "individual",
              to: phoneNumber,
              type: "video",
              video: {
                id: mediaId,
              },
            }
          : {
              recipient_type: "individual",
              to: phoneNumber,
              type: "audio",
              audio: {
                id: mediaId,
              },
            };
    }

    //send a question
    if (
      messageType === "questionNode" ||
      messageType === "documentNode" ||
      messageType === "emailNode" ||
      messageType === "phoneNumberNode" ||
      messageType === "numberNode" ||
      messageType === "dateNode" ||
      messageType === "timeNode" ||
      messageType === "websiteNode"
    ) {
      request = {
        recipient_type: "individual",
        to: phoneNumber,
        type: "text",
        text: {
          body: (() => {
            let msg = message;
            if (variables) {
              Object.keys(variables).forEach((key) => {
                msg = msg.replace(`{{${key}}}`, variables?.[`${key}`]);
              });
            }
            return msg;
          })(),
        },
      };
    }

    //send reply buttons
    if (messageType === "replyButtonsNode") {
      request = {
        recipient_type: "individual",
        to: phoneNumber,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: (() => {
              let msg = message;
              if (variables) {
                Object.keys(variables).forEach((key) => {
                  msg = msg.replace(`{{${key}}}`, variables?.[`${key}`]);
                });
              }
              return msg;
            })(),
          },
          action: {
            buttons: (() => {
              let buttons = [];
              replyButtons.forEach((replyButton, index) => {
                if (index < 3 && replyButton.label !== "") {
                  buttons.push({
                    type: "reply",
                    reply: {
                      id: uuidv4(),
                      title: replyButton.label,
                    },
                  });
                }
              });
              return buttons;
            })(),
          },
        },
      };
    }

    //send reply buttons
    if (
      (messageType === "listNode" || messageType === "dynamicListNode") &&
      listOptions?.length > 0
    ) {
      request = {
        recipient_type: "individual",
        to: phoneNumber,
        type: "interactive",
        interactive: {
          type: "list",
          body: {
            text: (() => {
              let msg = message;
              if (variables) {
                Object.keys(variables)?.forEach((key) => {
                  msg = msg.replace(`{{${key}}}`, variables?.[`${key}`]);
                });
              }
              return msg;
            })(),
          },
          action: {
            button: "Options",
            sections: (() => {
              let sectionsArray = [];
              listOptions?.forEach((listOption) => {
                sectionsArray.push({
                  title: listOption,
                  rows: [
                    {
                      id: uuidv4(),
                      title: listOption,
                      description: "",
                    },
                  ],
                });
              });
              return sectionsArray;
            })(),
          },
        },
      };
    }

    if (request) {
      let response = await axios({
        method: "post",
        url: `https://waba.360dialog.io/v1/messages`,
        data: request,
        headers: {
          "D360-API-KEY": process.env.WA_API_KEY,
        },
      });
      resolve(response);
    } else reject(null);
  });
}
