import {createRouter} from 'next-connect'
import multer from 'multer'

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai')

const API_KEY = process.env.GEMINI_API_KEY
const MODEL_NAME = 'gemini-pro-vision'

const upload = multer({
    storage: multer.memoryStorage()
})

const router = createRouter()

router.use(upload.single('image'))

router.all((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.status(200).end()
    } else {
        next()
    }
})
router.post(async (req, res) => {
    console.log('req.file:', req.file)
    try {
        console.log('Starting request...')
        const genAI = new GoogleGenerativeAI(API_KEY)
        const model = genAI.getGenerativeModel({ model: MODEL_NAME })

        const generationConfig = {
            temperature: 0.8,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096
        }

        const safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            }
        ]

        if (!req.file) {
            console.log('No file uploaded.')
            return res.status(400).json({ error: 'No file uploaded.' })
        }

        const parts = [
            {
                text: 'You are a skilled pet language translator. Based on the photos uploaded by users, you identify what kind of pet it is and accurately guess the pet\'s emotions and thoughts. You can guess what the pet wants to say based on the pet\'s body language, expression, and surrounding environment. After the translation, please give the "voice" of the pet according to the tone of the pet. Speak more naturally and answer in Turkish. The format is as follows: 🐶: <What kind of pet is this> <What the pet is thinking>. If there is no pet in the picture uploaded by the user, it will return "There is no pet in the picture~"'
            },
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: req.file.buffer.toString('base64')
                }
            }
        ]

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig,
            safetySettings
        })

        if (!result) {
            return res.status(502).json({ error: 'Bad Gateway' })
        } else {
            const responseText = result.response.text()
            return res.status(200).json({ result: responseText })
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
})

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true
    }
}

export default router.handler()
