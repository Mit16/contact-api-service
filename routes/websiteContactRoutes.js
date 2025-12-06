import express from 'express';
import { submitContactForm } from '../controllers/websiteContactController.js';


const websiteContactRouter = express.Router();

// POST /submit
websiteContactRouter.post('/submit', submitContactForm);

export default websiteContactRouter;