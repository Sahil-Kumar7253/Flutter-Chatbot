require("dotenv").config();

const {GoogleGenerativeAI} = require("@google/generative-ai")
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const {sessionCollection} = require("./pdf_controller");


console.log(process.env.GEMINI_API_KEY);

async function generateResponse(req, res){
    
    const {prompt} = req.body;

    if(!prompt){
        return res.status(400).json({error : "Prompt is required"});
    }
      
    if(!sessionCollection){
        return res.status(400).json({error : "No PDF has been Processed"});
    }
    
    try{
        const results = await sessionCollection.query({
            queryTexts : [prompt],
            nResults : 3
        });
        
        const context = results.documents[0].join("\n\n");
        const instruction = "Please use markdown for formatting. Make important keywords, titles, or key phrases bold using double asterisks. For example: 'This is the **main point**.' Do not use single asterisks for bolding. Now, answer the user's question. "
         
        const augmentedPrompt = `
        ${instruction}\n\n 
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

        const model = genAI.getGenerativeModel({model : "gemini-2.0-flash"});
        const result =  await model.generateContent(augmentedPrompt);
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