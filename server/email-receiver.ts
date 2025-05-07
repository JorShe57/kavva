
import type { Express } from 'express';
import { storage } from './storage';
import { processEmailWithAI } from './openai';
import * as SendGrid from '@sendgrid/mail';
import * as SendGridInbound from '@sendgrid/inbound-mail-parser';

interface EmailPayload {
  from: string;
  subject: string;
  text: string;
  html?: string;
  timestamp: string;
}

export function setupEmailRoutes(app: Express) {
  // Initialize SendGrid
  SendGrid.setApiKey(process.env.SENDGRID_API_KEY || '');

  // Endpoint to receive emails from SendGrid
  app.post('/api/email/webhook', async (req, res) => {
    try {
      const email = new SendGridInbound.Parse(req.body);
      
      // Extract email content
      const emailPayload = {
        from: email.from.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
        timestamp: new Date().toISOString()
      };
    try {
      const email: EmailPayload = req.body;
      
      // Find user by email address
      const user = await storage.getUserByEmail(email.from);
      if (!user) {
        return res.status(404).json({ message: 'User not found for this email' });
      }

      // Get user's default board
      const boards = await storage.getBoardsByUserId(user.id);
      const defaultBoard = boards[0]; // Use first board as default
      
      if (!defaultBoard) {
        return res.status(404).json({ message: 'No boards found for user' });
      }

      // Process email content with AI
      const tasks = await processEmailWithAI(email.text, {
        assignmentOption: 'assignToMe',
        username: user.username
      });

      // Add tasks to the board
      const createdTasks = [];
      for (const task of tasks) {
        const newTask = await storage.createTask({
          ...task,
          boardId: defaultBoard.id,
          userId: user.id,
          emailSource: email.text
        });
        createdTasks.push(newTask);
      }

      res.status(201).json({ 
        message: 'Email processed successfully',
        tasks: createdTasks 
      });
    } catch (error) {
      console.error('Error processing forwarded email:', error);
      res.status(500).json({ message: 'Failed to process email' });
    }
  });
}
