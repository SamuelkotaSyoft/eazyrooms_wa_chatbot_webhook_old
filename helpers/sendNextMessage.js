import axios from "axios";
import _ from "lodash";
import ChatHistory from "../models/chatHistoryModel.js";
import Chatbot from "../models/chatbotModel.js";
import guestModel from "../models/guestModel.js";
import getNextNode from "./getNextNode.js";
import saveChatHistory from "./saveChatHistory.js";
import sendWhatsAppMessage from "./sendWhatsAppMessage.js";
import { socket } from "./socket.js";

export default async function sendNextMessage({ locationId, phoneNumber }) {
  try {
    /**
     *
     * variable to store last chatbot message
     */
    let lastChatbotMessageId = null;
    let lastChatbotMessage = null;

    /**
     *
     * variable to store last user message
     */
    let lastUserMessage = null;

    /**
     *
     * variable to store chatbot node to send as message
     */
    let nextNode = null;

    /**
     *
     * get active chatbot
     */
    const chatbot = await Chatbot.findOne({
      location: locationId,
      active: true,
    });
    if (!chatbot) {
      return;
    }

    /**
     *
     * get chat history
     */
    let chatHistory = await ChatHistory.findOne({
      location: locationId,
      chatId: phoneNumber,
    });

    /**
     *
     * save last chatbot message
     */
    for (let i = chatHistory?.messages?.length; i > 0; i--) {
      if (
        chatHistory?.messages?.[i]?.from === "chatbot" &&
        chatHistory?.messages?.[i]?.type !== "validation"
      ) {
        lastChatbotMessage = chatHistory?.messages?.[i];
        lastChatbotMessageId = chatHistory?.messages?.[i]?.id;
        break;
      }
    }

    /**
     *
     * save last user message
     */
    for (let i = chatHistory?.messages?.length; i > 0; i--) {
      if (chatHistory?.messages?.[i]?.from === phoneNumber) {
        lastUserMessage = chatHistory?.messages?.[i];
        break;
      }
    }

    /**
     *
     * if last chatbot message has regex and last user message
     * doesnt match that regex then send error message
     */
    if (
      lastChatbotMessage?.regex &&
      !lastUserMessage?.message?.match(new RegExp(lastChatbotMessage?.regex))
    ) {
      await sendWhatsAppMessage({
        locationId: locationId,
        phoneNumber: phoneNumber,
        message: lastChatbotMessage?.errorMessage,
        messageType: "validation",
      });

      // save chat history
      await saveChatHistory({
        locationId: locationId,
        chatId: phoneNumber,
        source: "whatsapp",
        message: {
          from: "chatbot",
          id: "validation",
          message: lastChatbotMessage?.errorMessage,
          timestamp: Date.now(),
          type: "validation",
        },
      });

      socket.emit("RECEIVE_WHATSAPP_MESSAGE", {
        locationId: locationId,
      });
      return;
    }

    /**
     *
     * if last chatbot message has a variable then
     * save the last user message into the variable
     */
    if (lastChatbotMessage?.variable) {
      let variableName = lastChatbotMessage?.variable;

      let variableValue = lastUserMessage?.message;

      let obj = {};
      obj[`${variableName}`] = variableValue;

      //save variable in chat history
      await saveChatHistory({
        locationId: locationId,
        chatId: phoneNumber,
        source: "whatsapp",
        variable: obj,
      });

      chatHistory = await ChatHistory.findOne({
        location: locationId,
        chatId: phoneNumber,
      });
    }

    /**
     *
     * if last chabot message is not the last node in the chatbot
     * then get the next node to send as message
     */

    nextNode = await new Promise((resolve, reject) => {
      let node = getNextNode({
        currentNodeId: lastChatbotMessageId,
        chatHistory: chatHistory,
        nodes: chatbot.nodes,
        edges: chatbot.edges,
        phoneNumber: phoneNumber,
      });
      resolve(node);
    });

    /**
     *
     *
     * live chat node
     */
    if (nextNode && nextNode?.type === "liveChatNode") {
      await saveChatHistory({
        locationId: locationId,
        chatId: phoneNumber,
        source: "whatsapp",
        message: {
          from: "chatbot",
          id: nextNode?.id,
          timestamp: Date.now(),
          message: "Live chat started",
          type: nextNode?.type,
        },
      });

      await sendWhatsAppMessage({
        locationId: locationId,
        phoneNumber: phoneNumber,
        message: "Live chat started",
        messageType: "textMessageNode",
      });

      socket.emit("RECEIVE_WHATSAPP_MESSAGE", {
        locationId: locationId,
      });
      return;
    }

    /**
     *
     * order flow node
     */
    if (
      (nextNode && nextNode?.type === "orderFlowNode") ||
      lastChatbotMessage?.type === "orderFlowNode-storeList" ||
      lastChatbotMessage?.type === "orderFlowNode-storeCategories" ||
      lastChatbotMessage?.type === "orderFlowNode-productQuantity" ||
      lastChatbotMessage?.type === "orderFlowNode-storeProducts"
    ) {
      if (nextNode?.type === "orderFlowNode") {
        let storesRes = await axios({
          method: "get",
          url: `https://api.eazyrooms.com/api/v1/storeService/getAllStores/${locationId}`,
        });

        nextNode = {
          type: ""
        }

        await saveChatHistory({
          locationId: locationId,
          chatId: phoneNumber,
          source: "whatsapp",
          message: {
            from: "chatbot",
            id: nextNode?.id,
            timestamp: Date.now(),
            message: "storeList",
            variable: "storeName",
            timestamp: Date.now(),
            type: `${nextNode?.type}-storeList`,
          },
        });

        await sendWhatsAppMessage({
          locationId: locationId,
          phoneNumber: phoneNumber,
          message: "Please select a store",
          messageType: "dynamicListNode",
          variables: chatHistory?.variables,
          listOptions: storesRes.data.data.stores
            .map((store) => {
              return store.name.substring(0, 23);
            })
            .slice(0, 5),
        });
      }

      if (lastChatbotMessage?.type === "orderFlowNode-storeList") {
        let storesRes = await axios({
          method: "get",
          url: `https://api.eazyrooms.com/api/v1/storeService/getAllStores/${locationId}`,
        });

        let storeId = storesRes.data.data.stores.find(
          (store) => store.name === chatHistory?.variables?.storeName
        )?._id;

        let storeCategoriesRes = await axios({
          method: "get",
          url: `https://api.eazyrooms.com/api/v1/storeService/getAllStoreCategories/${storeId}`,
        });

        await saveChatHistory({
          locationId: locationId,
          chatId: phoneNumber,
          source: "whatsapp",
          message: {
            from: "chatbot",
            id: lastChatbotMessage?.id,
            timestamp: Date.now(),
            message: "storeCategories",
            variable: "storeCategoryName",
            timestamp: Date.now(),
            type: `orderFlowNode-storeCategories`,
          },
        });

        await sendWhatsAppMessage({
          locationId: locationId,
          phoneNumber: phoneNumber,
          message: "Please select a category",
          messageType: "dynamicListNode",
          variables: chatHistory?.variables,
          listOptions: storeCategoriesRes.data.data.storeCategories
            .map((storeCategory) => {
              return storeCategory.name.substring(0, 23);
            })
            .slice(0, 5),
        });
      }

      if (lastChatbotMessage?.type === "orderFlowNode-storeCategories") {
        let storesRes = await axios({
          method: "get",
          url: `https://api.eazyrooms.com/api/v1/storeService/getAllStores/${locationId}`,
        });

        let storeId = storesRes.data.data.stores.find(
          (store) => store.name === chatHistory?.variables?.storeName
        )?._id;

        let storeCategoriesRes = await axios({
          method: "get",
          url: `https://api.eazyrooms.com/api/v1/storeService/getAllStoreCategories/${storeId}`,
        });

        let storeCategoryId = storeCategoriesRes.data.data.storeCategories.find(
          (storeCategory) =>
            storeCategory.name === chatHistory?.variables?.storeCategoryName
        )?._id;

        let productsRes = await axios({
          method: "get",
          url: `https://api.eazyrooms.com/api/v1/storeService/getAllProducts/${storeId}?storeCategory=${storeCategoryId}`,
        });

        await saveChatHistory({
          locationId: locationId,
          chatId: phoneNumber,
          source: "whatsapp",
          message: {
            from: "chatbot",
            id: lastChatbotMessage?.id,
            timestamp: Date.now(),
            message: "Please select a product",
            variable: "productName",
            timestamp: Date.now(),
            type: `orderFlowNode-storeProducts`,
          },
        });

        await sendWhatsAppMessage({
          locationId: locationId,
          phoneNumber: phoneNumber,
          message: "Please select a product",
          messageType: "dynamicListNode",
          variables: chatHistory?.variables,
          listOptions: productsRes.data.data.products
            .map((product) => {
              return product.name.substring(0, 23);
            })
            .slice(0, 5),
        });
      }

      /**
       * ask user to enter quantity
       */
      if (lastChatbotMessage?.type === "orderFlowNode-storeProducts") {
        await saveChatHistory({
          locationId: locationId,
          chatId: phoneNumber,
          source: "whatsapp",
          message: {
            from: "chatbot",
            id: lastChatbotMessage?.id,
            timestamp: Date.now(),
            message: `How many ${chatHistory?.variables?.productName} would you like to order?`,
            variable: "productQuantity",
            timestamp: Date.now(),
            type: `orderFlowNode-productQuantity`,
          },
        });

        await sendWhatsAppMessage({
          locationId: locationId,
          phoneNumber: phoneNumber,
          message: `How many ${chatHistory?.variables?.productName} would you like to order?`,
          messageType: "textMessageNode",
          variables: chatHistory?.variables,
        });
      }

      /**
       *
       * place order
       */
      if (lastChatbotMessage?.type === "orderFlowNode-productQuantity") {
        //fetch stores
        let storesRes = await axios({
          method: "get",
          url: `https://api.eazyrooms.com/api/v1/storeService/getAllStores/${locationId}`,
        });

        //fetch store id
        let storeId = storesRes.data.data.stores.find(
          (store) => store.name === chatHistory?.variables?.storeName
        )?._id;

        //fetch store categories
        let storeCategoriesRes = await axios({
          method: "get",
          url: `https://api.eazyrooms.com/api/v1/storeService/getAllStoreCategories/${storeId}`,
        });

        //fetch store category id
        let storeCategoryId = storeCategoriesRes.data.data.storeCategories.find(
          (storeCategory) =>
            storeCategory.name === chatHistory?.variables?.storeCategoryName
        )?._id;

        //fetch products
        let productsRes = await axios({
          method: "get",
          url: `https://api.eazyrooms.com/api/v1/storeService/getAllProducts/${storeId}?storeCategory=${storeCategoryId}`,
        });

        //fetch product id
        let productId = productsRes.data.data.products.find(
          (product) => product.name === chatHistory?.variables?.productName
        )?._id;

        //fetch guest uid
        const guest = await guestModel.findOne({
          phoneNumber: phoneNumber,
          location: locationId,
        });

        let orderRes = await axios({
          method: "post",
          url: `https://api.eazyrooms.com/api/v1/orderService/creatOrderByWhatsapp/${guest?.uid}`,
          data: {
            products: [
              {
                product: productId,
                quantity: chatHistory?.variables?.productQuantity,
              },
            ],
            paymentMethod: "cash",
            paymentStatus: "pending",
            room: "64785f439465db022b44544f",
            store: storeId,
          },
        });

        await saveChatHistory({
          locationId: locationId,
          chatId: phoneNumber,
          source: "whatsapp",
          message: {
            from: "chatbot",
            id: lastChatbotMessage?.id,
            timestamp: Date.now(),
            message: "saveOrder",
            timestamp: Date.now(),
            type: `orderFlowNode-saveOrder`,
          },
        });

        await sendWhatsAppMessage({
          locationId: locationId,
          phoneNumber: phoneNumber,
          message: "order placed successfully",
          messageType: "textMessageNode",
        });
      }

      socket.emit("RECEIVE_WHATSAPP_MESSAGE", {
        locationId: locationId,
      });
      return;
    }

    /**
     *
     * question type nodes
     */
    if (
      nextNode &&
      (nextNode?.type === "questionNode" ||
        nextNode?.type === "documentNode" ||
        nextNode?.type === "replyButtonsNode" ||
        nextNode?.type === "emailNode" ||
        nextNode?.type === "phoneNumberNode" ||
        nextNode?.type === "numberNode" ||
        nextNode?.type === "dateNode" ||
        nextNode?.type === "timeNode" ||
        nextNode?.type === "websiteNode" ||
        nextNode?.type === "listNode" ||
        nextNode?.type === "dynamicListNode")
    ) {
      await saveChatHistory({
        locationId: locationId,
        chatId: phoneNumber,
        source: "whatsapp",
        message: {
          from: "chatbot",
          id: nextNode?.id,
          timestamp: Date.now(),
          message:
            nextNode?.data?.values.message ?? nextNode?.data?.values.link,
          media: nextNode?.data?.values.media,
          regex: nextNode?.data?.values.regex,
          errorMessage: nextNode?.data?.values.errorMessage,
          variable: nextNode?.data?.values.variable,
          timestamp: Date.now(),
          type: nextNode?.type,
        },
      });

      /**
       *
       * dynamic list node
       */
      if (nextNode?.type === "dynamicListNode") {
        const apiResponse = await axios({
          method: nextNode?.data?.values?.requestMethod,
          url: `${nextNode?.data?.values?.requestUrl}${
            nextNode?.data?.values?.requestParams ?? ""
          }`,
          data: nextNode?.data?.values?.requestBody ?? {},
          headers: {
            "Content-Type": "application/json",

            ...(nextNode?.data?.values?.headers ?? {}),
          },
        });

        await sendWhatsAppMessage({
          locationId: locationId,
          phoneNumber: phoneNumber,
          message: nextNode?.data?.values?.message,
          messageType: "dynamicListNode",
          variables: chatHistory?.variables,
          listOptions: nextNode?.data?.values?.accessor
            ? apiResponse?.data?.map((item) =>
                _.get(item, nextNode?.data?.values?.accessor).substr(0, 23)
              )
            : apiResponse?.data,
        });

        socket.emit("RECEIVE_WHATSAPP_MESSAGE", {
          locationId: locationId,
        });
        return;
      } else {
        await sendWhatsAppMessage({
          locationId: locationId,
          phoneNumber: phoneNumber,
          message:
            nextNode?.data?.values?.message ?? nextNode?.data?.values?.link,
          media: nextNode?.data?.values?.media,
          messageType: nextNode?.type,
          replyButtons: nextNode?.data?.values?.buttons,
          variables: chatHistory?.variables,
          listOptions: nextNode?.data?.values?.options,
        });

        socket.emit("RECEIVE_WHATSAPP_MESSAGE", {
          locationId: locationId,
        });
        return;
      }
    }

    /**
     *
     * if next node is not a question type node then send the next node as message
     */
    await saveChatHistory({
      locationId: locationId,
      chatId: phoneNumber,
      source: "whatsapp",
      message: {
        from: "chatbot",
        id: nextNode?.id,
        timestamp: Date.now(),
        message: nextNode?.data?.values.message ?? nextNode?.data?.values.link,
        media: nextNode?.data?.values.media,
        regex: nextNode?.data?.values.regex,
        errorMessage: nextNode?.data?.values.errorMessage,
        variable: nextNode?.data?.values.variable,
        type: nextNode?.type,
      },
    });

    await sendWhatsAppMessage({
      locationId: locationId,
      phoneNumber: phoneNumber,
      message: nextNode?.data?.values?.message ?? nextNode?.data?.values?.link,
      media: nextNode?.data?.values?.media,
      messageType: nextNode?.type,
      replyButtons: nextNode?.data?.values?.buttons,
      variables: chatHistory?.variables,
      listOptions: nextNode?.data?.values?.options,
    });

    socket.emit("RECEIVE_WHATSAPP_MESSAGE", {
      locationId: locationId,
    });

    /**
     *
     * call sendNextMessage recursively
     */
    setTimeout(() => {
      sendNextMessage({
        locationId: locationId,
        location: locationId,
        phoneNumber: phoneNumber,
      });
    }, 1000);
  } catch (err) {}
}
