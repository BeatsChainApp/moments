import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}`;

export const whatsappAPI = axios.create({
  baseURL: WHATSAPP_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

export const sendMessage = async (to, message) => {
  try {
    const response = await whatsappAPI.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      ...message
    });
    return response.data;
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error.message);
    throw error;
  }
};

export const getMedia = async (mediaId) => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` }
    });
    return response.data;
  } catch (error) {
    console.error('Media fetch error:', error.response?.data || error.message);
    throw error;
  }
};

export const downloadMedia = async (mediaUrl) => {
  try {
    const response = await axios.get(mediaUrl, {
      headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` },
      responseType: 'stream'
    });
    return response.data;
  } catch (error) {
    console.error('Media download error:', error.response?.data || error.message);
    throw error;
  }
};