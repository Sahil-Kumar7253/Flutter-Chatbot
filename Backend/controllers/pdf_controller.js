require("dotenv").config();
const {GoogleGenerativeAI} = require("@google/generative-ai");
const {ChromaClient} = require("chromadb");
const pdf = require('pdf-parse');
const crypto = require("crypto");

const sessions =new Map();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const client = new ChromaClient({ path: "http://localhost:8000" });

let sessionCollection = null;

const embeddingFuction = {
    generate : async (texts) => {
        // --- START OF DIAGNOSTIC LOGGING ---
        console.log(`--- Embedding function received ${texts.length} items to process ---`);
        // The line below will show us exactly what data is coming in.
        // console.log('INCOMING DATA:', texts); 
        // --- END OF DIAGNOSTIC LOGGING ---

        // ✨ A more robust filter to remove null, undefined, and empty/whitespace-only strings.
        const filteredTexts = texts.filter(text => {
            return text && typeof text === 'string' && text.trim() !== '';
        });

        console.log(`--- After filtering, ${filteredTexts.length} valid items remain ---`);

        if (filteredTexts.length === 0) {
            console.log("No valid texts to embed after filtering. Returning empty array.");
            return [];
        }
        
        try {const model = genAI.getGenerativeModel({model : "text-embedding-004"});

        const result = await model.batchEmbedContents({
            requests : filteredTexts.map((text) => {
                ({
                    model : "models/text-embedding-004", content : {parts : [{ text: text.trim()}]}
                })
            })
        });

        return result.embeddings.map((e) => e.values);
        }catch(error){
            console.error("Error during batchEmbedContents API call:", error);
            // Re-throw the error so the calling function knows something went wrong.
            throw error; 
        }
    }
};

async function  processPdf(req, res) {

    if(!req.file){
       console.log('--- Multer did not find a file. Check field name. ---'); 
       return res.status(400).json({error : "No file uploaded"});
    }
    console.log("PDF Recived. Processing.....");

    try{
  
        const data = await pdf(req.file.buffer);
        const pdfText = data.text;

        const textChunks = pdfText.split("\n\n").filter((chunk) => chunk.trim() !== "");
    
        const sessionId = crypto.randomUUID();
        
        
        const collectionName = `session_${sessionId}`;
        collection = await client.createCollection({
            name : collectionName,
            embeddingFunction : embeddingFuction
        });
        
        const batchSize = 100;
        for (let i = 0; i < textChunks.length; i += batchSize) {
            const batch = textChunks.slice(i, i + batchSize);
            const batchIds = Array.from({ length: batch.length }, (_, j) => `chunk_${i + j}`);
            
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(textChunks.length / batchSize)}...`);

            await collection.add({
                ids: batchIds,
                documents: batch,
            });
        }

        sessions.set(sessionId, collection);
        module.exports.sessions = sessions;

        console.log("Pdf Processed Successfully");
        return res.status(200).json({message : "PDF Processed Successfully"});
    }catch(e){
        console.log("Error is" + e);
        return res.status(500).json({error : "Something went wrong"});
    }
}

module.exports.sessions = sessions;
module.exports = {
    processPdf
}