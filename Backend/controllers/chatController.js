require("dotenv").config();

const {GoogleGenerativeAI} = require("@google/generative-ai")
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log(process.env.GEMINI_API_KEY);

async function generateResponse(req, res){
    try{
        const {prompt} = req.body;

        if(!prompt){
            return res.status(400).json({error : "Prompt is required"});
        }

        const instruction = "Please use markdown for formatting. Make important keywords, titles, or key phrases bold using double asterisks. For example: 'This is the **main point**.' Do not use single asterisks for bolding. Now, answer the user's question. "
        
        const fullPrompt = `${instruction}\n\nUser Question: ${prompt}`

        const model = genAI.getGenerativeModel({model : "gemini-2.0-flash"});
        const result =  await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return res.status(200).json({response : text});

    }catch (e) {
        console.log("Error is" + e);
        return res.status(500).json({error : "Something went wrong"});
    }
}

module.exports = {
    generateResponse
}