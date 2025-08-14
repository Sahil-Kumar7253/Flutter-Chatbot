require("dotenv").config();

const {GoogleGenerativeAI} = require("@google/generative-ai")
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const {sessions} = require("./pdf_controller");


console.log(process.env.GEMINI_API_KEY);

async function generateResponse(req, res){
    
    const {prompt,sessionId} = req.body;

    if(!prompt){
        return res.status(400).json({error : "Prompt is required"});
    }

    const model = genAI.getGenerativeModel({model : "gemini-2.0-flash"});

    try{
        let responseText;

        if(sessionId && sessions.has(sessionId)){
            console.log(`Handling RAG chat for session: ${sessionId}`);
            const collection = sessions.get(sessionId);
         
            const results = await collection.query({
            queryTexts : [prompt],
            nResults : 3
            });

            const context = results.documents[0].join("\n\n");

              
            const augmentedPrompt = `
            You are a helpful Q&A assistant. Your task is to answer the user's question.

              **Instructions:**
              1.  First, carefully analyze the "PROVIDED CONTEXT" from a document.
              2.  If the context contains a relevant answer to the "USER QUESTION", formulate your response directly from this context.
              3.  If the context is not relevant or does not contain the answer, you MUST answer the "USER QUESTION" using your own general knowledge.
              4.  **Crucially, your final response should NEVER mention the "PROVIDED CONTEXT".** The user should not know whether the answer came from the document or from your general knowledge.
              5.  Use markdown for formatting.

              ---
              **PROVIDED CONTEXT:**
              ${context}
              ---

              **USER QUESTION:**
              "${prompt}"
            `;

            const result =  await model.generateContent(augmentedPrompt);
            responseText = result.response.text();

        }else{
            const instruction = "Please use markdown for formatting. Make important keywords, titles, or key phrases bold using double asterisks. For example: 'This is the **main point**.' Do not use single asterisks for bolding. Now, answer the user's question. "
            
            const finalPrompt = `${instruction} \n\n User Question : ${prompt}`;
            const result =  await model.generateContent(finalPrompt);
            responseText = result.response.text();
        }
        
        return res.status(200).json({response : responseText});

    }catch (e) {
        console.log("Error is" + e);
        return res.status(500).json({error : "Something went wrong"});
    }
}

module.exports = {
    generateResponse
}