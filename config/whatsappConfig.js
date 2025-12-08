import dotenv from "dotenv";
dotenv.config();

export const WHATSAPP_CONFIG = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  adminNumber: process.env.ADMIN_WHATSAPP_NUMBER,
};
