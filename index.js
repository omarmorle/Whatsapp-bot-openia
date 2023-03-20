// Autores: Manu, Omar y Yair

// Importar las dependencias necesarias
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const sharp = require('sharp');
const { Sticker } = require('wa-sticker-formatter');

// Configurar las constantes de API
const API_KEY = 'AQUI_TU_API_KEY_DE_OPENAI';
const GPT_URL = 'https://api.openai.com/v1/engines/text-davinci-003/completions';
const DALLE_URL = 'https://api.openai.com/v1/images/generations';

// Crear un cliente de WhatsApp
const client = new Client();

// Generar el código QR para conectar el cliente de WhatsApp
client.on('qr', (qr) => {
    console.log('QR recibido, escanea con tu teléfono.');
    qrcode.generate(qr, { small: true });
});

// Confirmar cuando el cliente está listo y conectado
client.on('ready', () => {
    console.log('Cliente listo y conectado a WhatsApp!');
});

// Manejar mensajes entrantes
client.on('message', async (message) => {
    if (message.isGroupMsg) return; // Ignorar mensajes de grupos

    // Si el mensaje es una imagen, convertirlo en un sticker
    if (message.hasMedia && message.type === 'image') {
        const stickerData = await convertImageToSticker(message);
        if (stickerData) {
            const stickerMedia = new MessageMedia('image/webp', stickerData, { mimetype: 'image/webp' });
            message.reply(stickerMedia, null, { sendMediaAsSticker: true });
        } else {
            message.reply('Lo siento, no pude convertir la imagen en sticker.');
        }
    // Si el mensaje es un audio, enviar una respuesta genérica
    } else if (message.hasMedia && message.type === 'audio') {
        message.reply('No lo he escuchado, pero quiero que sepas que si es algo bueno, cuentas con todo mi apoyo y si por desgracia es algo malo, lamento mucho lo sucedido.');
    } else {
        const prompt = message.body.toLowerCase();

        // Respuestas específicas para ciertos mensajes
        if (prompt === 'huevos') {
            message.reply('Vayanse a la verga');
        // Generar una imagen basada en el texto proporcionado
        } else if (prompt.startsWith('imagen: ')) {
            const imagePrompt = prompt.slice(8).trim(); // Elimina "imagen: " del mensaje
            const imageData = await generateImage(imagePrompt);

            if (imageData) {
                const imageMedia = new MessageMedia('image/png', imageData);
                message.reply(imageMedia);
            } else {
                message.reply('Lo siento, no pude generar una imagen con ese texto.');
            }
        // Generar una respuesta de chat basada en el texto proporcionado
        } else if (prompt.startsWith('!chat ')) {
            const chatPrompt = prompt.slice(6).trim(); // Elimina "!chat " del mensaje
            const response = await generateResponse(prompt);
            if (response) {
                message.reply(response);
            }
        }
    }
});

// Iniciar el cliente de WhatsApp
client.initialize();

// Función para generar una respuesta utilizando GPT-3
async function generateResponse(prompt) {
    try {
        const response = await axios.post(
            GPT_URL,
            {
                prompt: prompt,
                max_tokens: 150,
                n: 1,
                stop: null,
                temperature: 1,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
            }
        );

        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error('Error al generar respuesta:', error);
        return null;
    }
}

// Función para generar una imagen utilizando DALL-E
async function generateImage(prompt) {
    try {
        const response = await axios.post(
            DALLE_URL,
            {
                prompt: prompt,
                n: 1,
                size: "256x256",
                response_format: "url",
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
            }
        );

        const imageURL = response.data.data[0].url;
        const imageResponse = await axios.get(imageURL, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');

        const imageData = (await sharp(imageBuffer).png().toBuffer()).toString('base64');
        return imageData;
    } catch (error) {
        console.error('Error al generar imagen:', error);
        return null;
    }
}

// Función para convertir una imagen en un sticker de WhatsApp
async function convertImageToSticker(message) {
    try {
        const media = await message.downloadMedia();
        const imageBuffer = Buffer.from(media.data, 'base64');
        const stickerImage = await sharp(imageBuffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
        const sticker = new Sticker(stickerImage, { type: 'full', pack: 'WhatsApp Sticker', author: 'botsinho', crop: false });
        const stickerBuffer = await sticker.build();

        return stickerBuffer.toString('base64');
    } catch (error) {
        console.error('Error al convertir imagen en sticker:', error);
        return null;
    }
}