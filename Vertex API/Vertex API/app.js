// We work with: Vertex AI SDK


const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

const express = require('express');
const multer = require('multer');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const utils = require("./utils");
// Function to generate content using Google Generative AI
async function generateContentFromPDF(filePath, jobDescription, textPrompt) {
    // Initialize GoogleGenerativeAI and GoogleAIFileManager with API_KEY.
    const genAI = new GoogleGenerativeAI("AIzaSyBNDkvkF1-NHuIFFsPkDqGa9K1tG4FLViA");
    const fileManager = new GoogleAIFileManager("AIzaSyBNDkvkF1-NHuIFFsPkDqGa9K1tG4FLViA");

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
    });

    // Upload the file and specify a display name.
    const uploadResponse = await fileManager.uploadFile(filePath, {
        mimeType: "application/pdf",
        displayName: "Uploaded PDF", // You can customize this
    });

    console.log(
        `Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`,
    );

    // Generate content 
    const result = await model.generateContent([
        {
            fileData: {
                mimeType: uploadResponse.file.mimeType,
                fileUri: uploadResponse.file.uri,
            },
        },
        {
            text: textPrompt + jobDescription
        },
    ]);

    return result;
}

//===================================================================
//    NO NEED TO INSTALL ANYTHING, JUST THE REGULAR GEMINI SDK WE ALREADY USED
app.get('/afterhello', async (req, res) => {
    // Initialize GoogleGenerativeAI with API_KEY.
    const genAI = new GoogleGenerativeAI("AIzaSyBNDkvkF1-NHuIFFsPkDqGa9K1tG4FLViA");
    // Initialize GoogleAIFileManager with API_KEY.
    const fileManager = new GoogleAIFileManager("AIzaSyBNDkvkF1-NHuIFFsPkDqGa9K1tG4FLViA");

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",  // which model to use
    });

    // Upload the file and specify a display name.
    const uploadResponse = await fileManager.uploadFile("CV/CV_student_SW.pdf", {
        mimeType: "application/pdf",
        displayName: "Anna CV PDF",
    });

    // Print the response.
    console.log(
        `Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`,
    );

    const theJob = require("./job");
    let theJobOffering = theJob.job;

    // Generate content using text and the URI reference for the uploaded file.
    const result = await model.generateContent([
        {
            fileData: {
                mimeType: uploadResponse.file.mimeType,
                fileUri: uploadResponse.file.uri,
            },
        },
        // { text: "Please summarize this document as list of skills formated as valid json object without any quates marks" },
        // { text: "Please summarize this document as list of tech skills" },
        {
            text: `Please create a cover letter for my resume based on the attached document which fits the following job offering: ` +
                `${theJobOffering}`
        },
    ]);

    // Output the generated text to the console
    console.log(result.response.text());
    res.send(result.response.text())
})
//===========================================
// please remember to run: npm i multer
// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Specify upload directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Rename uploaded file
    }
});

const upload = multer({ storage: storage });

// Middleware to handle file upload and add path LOCATION to req object
const uploadAndAttachPath = (req, res, next) => {
    upload.single('pdfFile')(req, res, (err) => {
        if (err) {
            return res.status(400).send('Error uploading file.');
        }

        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        console.log("req.file.path from client:", req.file.path);

        req.filePathLocation = req.file.path; // TODO: check value again
        next();
    });
};

//====================
app.post('/upload', uploadAndAttachPath, async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Access uploaded file information
    console.log("+++++++ req.file", req.file);
    //console.log("******* req.filePathLocation.path", req.filePathLocation.path);


    // Process the uploaded PDF (e.g., save to database, analyze content, etc.)
    const filePathToPrint = `PDF uploaded successfully! ${req.file.path}`;
    console.log("filePathToPrint", filePathToPrint);


    const filePath = req.file.path;
    // const theJob = require("./job").job;
    console.log("the body.jobDescription", req.body.jobDescription);

    // getting the job description from the req body
    const theJob = req.body.jobDescritionText;

    const jobDescription = theJob;
   // const prompt = "Please create a cover letter for my resume based on the attached document which fits the following job offering: ";
    const prompt = "I am providing you with job description that I found online, you only have to read it and understand from it how to write for me a cover letter, Please create a cover letter for my resume based on my attached resume which fits the job offering, make sure to insert the correct job offering title and company in the letter";

    try {
        const result = await generateContentFromPDF(filePath, jobDescription, prompt);
        console.log(result.response.text());
        res.send(result.response.text());
    } catch (error) {
        console.error("Error generating content:", error);
        res.status(500).send("An error occurred while processing your request.");
    }


    // res.send({ message: theMsg });
});


//==================================================


app.use(express.static('public'));
//=========================
app.listen(3001, function () {
    console.log('My app is listening on port 3001!');
});
