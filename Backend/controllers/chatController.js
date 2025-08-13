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

    const model = genAI.getGenerativeModel({model : "gemini-1.5-flash-latest"});

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
            You are an expert Q&A assistant. Your primary goal is to answer questions based on the provided PDF document context.
          
            Follow these rules strictly:
            1.  First, analyze the **PROVIDED DOCUMENT CONTEXT** below to find the answer.
            2.  If the answer is fully contained within the context, provide it directly.
            3.  If the context does **not** contain the answer, and only in that case, state clearly: "I could not find the answer in the uploaded document." and then proceed to search the internet for a general answer.
            4.  Never invent information or mix details from the document with external knowledge.
          
            ---
            PROVIDED DOCUMENT CONTEXT:
            ${context}
            ---
          
            USER QUESTION:
            "${prompt}"
            ` ;

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