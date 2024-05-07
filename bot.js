const { Telegraf, Markup } = require('telegraf');
const sharp = require('sharp');
const fetch = require('node-fetch');

const bot = new Telegraf('7064042336:AAHbMDFoEHVl_qUnjOe7NPfp5mueLDBf-lY');
const state = {};
bot.start((ctx) => {
    ctx.reply(
        'Welcome to the Image Processing Bot! Please select an option:',
        Markup.inlineKeyboard([
            [
                Markup.button.callback('Image Resizing', 'resize_option'),
            ],
            [
                Markup.button.callback('PDF Compression (Coming Soon)', 'pdf_compression_option'),
            ],
            [
                Markup.button.callback('Image Compression (Coming Soon)', 'image_compression_option'),
            ],
        ])
    );
});
bot.action('resize_option', (ctx) => {
    ctx.reply('Please select a resizing method:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Resize by Dimensions', callback_data: 'resize_by_dimensions' }],
                [{ text: 'Resize by File Size', callback_data: 'resize_by_filesize' }],
            ],
        },
    });
});

bot.action('resize_by_dimensions', (ctx) => {
    ctx.reply('Please enter the desired dimensions (width x height), e.g., "800x600".');
});

bot.action('resize_by_filesize', (ctx) => {
    ctx.reply('Please enter the target file size (e.g., "100kb").');
});

bot.action('resize_by_dimensions', (ctx) => {
    ctx.reply('Please enter the desired dimensions (width x height), e.g., "800x600".');
});

bot.action('resize_by_filesize', (ctx) => {
    ctx.reply('Please enter the target file size (e.g., "100kb").');
});

bot.on('message', async (ctx) => {
    console.log(Object.keys(state).length);
    let messageText;
    if(ctx.message.text){
         messageText = ctx.message.text?.trim().toLowerCase();
    }
    
if(ctx.message.text){
    if (messageText.includes('x')) {
        // User input is dimensions (e.g., "800x600")
        const [width, height] = messageText.split('x').map(Number);
        state.width = width;
        state.height = height;
        ctx.reply('Please upload an image to resize.');
    } else if (messageText.endsWith('kb')) {
        // User input is file size (e.g., "100kb")
        const targetSizeInKB = parseInt(messageText);
        state.targetSizeInKB = targetSizeInKB;
        ctx.reply('Please upload an image to resize.');
    }
}
     else if (ctx.message.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        if (photo) {
            if (state.width && state.height) {
                await handleImageResizeByDimensions(ctx, photo, state.width, state.height);
                // Reset state after use
                delete state.width;
                delete state.height;
            } else if (state.targetSizeInKB) {
                await handleImageResizeByFileSize(ctx, photo, state.targetSizeInKB);
                // Reset state after use
                delete state.targetSizeInKB;
            }
        } else {
            ctx.reply('Please upload a valid image.');
        }
    } else {
        ctx.reply('Invalid input. Please provide dimensions (e.g., "800x600") or target file size (e.g., "100kb").');
    }
});

async function handleImageResizeByDimensions(ctx, photo, width, height) {
    const imageBuffer = await fetchAndDownloadImage(photo.file_id);
    const resizedImageBuffer = await sharp(imageBuffer)
        .resize({ width, height })
        .toBuffer();

    await sendImageToUser(ctx, resizedImageBuffer);
}

async function handleImageResizeByFileSize(ctx, photo, targetSizeInKB) {
    try {
        const imageBuffer = await fetchAndDownloadImage(photo.file_id);

        // Define initial compression quality parameters
        let minQuality = 1;
        let maxQuality = 100;
        let quality = 90;
        let outputBuffer = imageBuffer; // Start with original image buffer
        let iterations = 0;

        // Maximum number of iterations to prevent infinite loop
        const maxIterations = 10; // Adjust as needed based on performance

        while (iterations < maxIterations) {
            // Compress image with the current quality setting
            outputBuffer = await sharp(outputBuffer)
                .resize({ fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality })
                .toBuffer();

            const currentSizeKB = outputBuffer.length / 1024;
            console.log(`Iteration ${iterations + 1}: Image size ${currentSizeKB} KB (Target ${targetSizeInKB} KB, Quality ${quality})`);

            // Check if current image size is close to the target size
            if (currentSizeKB < targetSizeInKB - 10) {
                // Image size is too small, increase quality
                minQuality = quality;
                quality = Math.min(Math.floor((minQuality + maxQuality) / 2), 100); // Cap quality at 100
            } else if (currentSizeKB > targetSizeInKB + 10) {
                // Image size is too large, decrease quality
                maxQuality = quality;
                quality = Math.max(Math.floor((minQuality + maxQuality) / 2), 1); // Ensure quality is at least 1
            } else {
                // Image size is within acceptable range, stop iteration
                break;
            }

            iterations++;
        }

        // Send the resized image back to the user
        await sendImageToUser(ctx, outputBuffer);
    } catch (error) {
        console.error('Error resizing image:', error);
        ctx.reply('An error occurred while resizing the image. Please try again.');
    }
}


async function fetchAndDownloadImage(fileId) {
    const file = await bot.telegram.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    return response.buffer();
}

async function sendImageToUser(ctx, imageBuffer) {
    await ctx.replyWithPhoto({ source: imageBuffer });
}

// Start the bot
bot.launch().then(() => console.log('Bot is running...'));