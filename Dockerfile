FROM node:18

WORKDIR /usr/src/eazyrooms_wa_chatbot_webhook

COPY package*.json ./

COPY . .

RUN npm install

EXPOSE 3010

CMD ["node", "server.js"]