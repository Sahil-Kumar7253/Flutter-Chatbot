require("dotenv").config();
const {GoogleGenerativeAI} = require("@google/generative-ai");
const {ChromaClient} = require("chromadb");
const pdf = require('pdf-parse');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const client = new ChromaClient();

let sessionCollection = null;

const embeddingFuction = {
    generate : async (texts) => {
        const model = genAI.getGenerativeModel({model : "text-embedding-004"});
        const result = await model.batchEmbedContents({
            requests : texts.map((text) => {
                ({
                    model : "models/text-embedding-004", content : {parts : [{text}]}
                })
            })
        });

        return result.embeddings.map((e) => e.values);
    }
};

async function  processPdf(req, res) {
    if(!req.file){
        return res.status(400).json({error : "No file uploaded"});
    }
    console.log("PDF Recived. Processing.....");

    try{

        const data = await pdf(req.file.path);
        const pdfText = data.text;

        const textChunks = pdfText.split("\n\n").filter((chunk) => chunk.trim() !== "");

        const collectionName = `session_${Date.now()}`;
        sessionCollection = await client.createCollection({
            name : collectionName,
            embeddingFunction : embeddingFuction
        });
            
        await sessionCollection.add({
            ids : textChunks.map((_, i) => `chunk_${i}`),
            documents : textChunks
        })
         
        module.exports.sessionCollection = sessionCollection;

        console.log("Pdf Processed Successfully");
        return res.status(200).json({message : "PDF Processed Successfully"});
    }catch(e){
        console.log("Error is" + e);
        return res.status(500).json({error : "Something went wrong"});
    }
}

module.exports = {
    processPdf
}