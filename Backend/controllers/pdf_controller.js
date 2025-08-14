require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChromaClient } = require('chromadb');
const pdf = require('pdf-parse');
const crypto = require('crypto');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chroma = new ChromaClient({ path: "http://localhost:8000" });
const sessions = new Map();


const embeddingFunction = {
    generate: async (texts) => {
        const filteredTexts = texts.filter(text => text && typeof text === 'string' && text.trim() !== '');

        if (filteredTexts.length === 0) {
            return [];
        }

        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        
        try {
            const result = await model.batchEmbedContents({
                requests: filteredTexts.map((text) => {
                    return { content: { parts: [{ text: text.trim() }] } };
                }),
            });
            return result.embeddings.map((e) => e.values);
        } catch (error) {
            console.error("Error during batchEmbedContents API call:", error);
            throw error; 
        }
    },
};


exports.processPdf = async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No PDF file uploaded.');
    }
    console.log(`Processing PDF: ${req.file.originalname}`);

    try {
        const data = await pdf(req.file.buffer);
        const pdfText = data.text;
        const textChunks = pdfText.split('\n\n').filter(chunk => chunk.trim() !== '');
        
        const sessionId = crypto.randomUUID();
        const collectionName = `session_${sessionId}`;
        
        const collection = await chroma.createCollection({ 
            name: collectionName, 
            embeddingFunction: embeddingFunction 
        });

        const batchSize = 100;
        for (let i = 0; i < textChunks.length; i += batchSize) {
            const batch = textChunks.slice(i, i + batchSize);
            const batchIds = Array.from({ length: batch.length }, (_, j) => `chunk_${i + j}`);
            
            console.log(`Embedding batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(textChunks.length / batchSize)}...`);

            await collection.add({
                ids: batchIds,
                documents: batch,
            });
        }

        sessions.set(sessionId, collection);
        module.exports.sessions = sessions;

        console.log(`✅ PDF processed successfully for session: ${sessionId}`);
        
        res.status(200).send({ message: 'PDF processed successfully.', sessionId: sessionId });

    } catch (error) {
        console.error('Error during PDF processing:', error);
        res.status(500).send({ error: 'Failed to process PDF content.' });
    }
};

module.exports.sessions = sessions;