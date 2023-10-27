import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import path from "path";
import continueConversation from "./helpers/continueConversation.js";

const app = express();
const port = 3010;

app.use(cors());
app.use(express.json());

const __dirname = path.resolve();
dotenv.config({
  path: path.resolve(__dirname, ".env"),
});

app.post("/", (req, res) => {
  try {
    /**
     *
     * firebase auth uid
     */
    const locationId = req.headers.locationid;
    console.log({ location: req.headers });

    /**
     *
     * phone number of user
     */
    const phoneNumber =
      req.body?.contacts?.[0]?.wa_id ??
      req.body?.statuses?.[0]?.message?.recipient_id;
    console.log({ phoneNumber });

    /**
     * messages from user
     */
    const messages = req.body?.messages;

    console.log({ requestBody: JSON.stringify(req.body) });
    console.log({ locationId });
    console.log({ phoneNumber });

    /**
     *
     * continue conversation with user
     */
    continueConversation({ locationId, phoneNumber, messages });
    /**
     *
     * send response to webhook
     */
    res.status(200).json({ status: true });
  } catch (err) {
    //catch and log errors
    console.log({ err });
    res.status(200).json({ status: false, err: err });
  }
});

app.listen(port, () => {
  console.log(`WA Chatbot Webhook Listening on Port ${port}`);
});

app.get("/", (req, res) => {
  res.status(200).json({ status: "OK", service: "Chatbot Webhook Service" });
});
