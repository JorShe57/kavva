import express from 'express';
import { storage } from './storage';
import { processEmailWithAI } from './openai';
import { MailService } from '@sendgrid/mail';
import * as SendGridInbound from '@sendgrid/inbound-mail-parser';

const SendGrid = new MailService();
SendGrid.setApiKey(process.env.SENDGRID_API_KEY || '');

// Configure SendGrid domain settings
const SENDGRID_PARSE_DOMAIN = process.env.SENDGRID_PARSE_DOMAIN || '';
if (!SENDGRID_PARSE_DOMAIN) {
  console.warn('Warning: SENDGRID_PARSE_DOMAIN environment variable is not set');
}

export function setupEmailRoutes(app: express.Express) {
  // Test endpoint
  app.post('/api/email/test', async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: 'OpenAI API key not configured' });
      }

      // For testing, create a simplified email object that matches the expected structure
      const testEmail = 'jorshevel@gmail.com'; // Using the specified email address

      // First check if user exists
      const existingUser = await storage.getUserByEmail(testEmail);
      if (!existingUser) {
        return res.status(404).json({ message: `No user found with email ${testEmail}. Please register first or use a registered email for testing.` });
      }

      const email = {
        from: { email: testEmail },
        subject: 'Test Email',
        text: req.body.text || 'Create two test tasks: 1. Make volunteer application writable 2. Replace volunteer application on website',
        html: '<p>Test email content</p>'
      };
      const emailPayload = {
        from: email.from.email,
        subject: email.subject,
        text: email.text || email.subject,
        html: email.html,
        timestamp: new Date().toISOString()
      };

      // Find user and process email
      const user = await storage.getUserByEmail(emailPayload.from);
      if (!user) {
        return res.status(404).json({ message: 'User not found for this email' });
      }

      const boards = await storage.getBoardsByUserId(existingUser.id); // Use existingUser.id here
      const defaultBoard = boards[0];

      if (!defaultBoard) {
        return res.status(404).json({ message: 'No boards found for user' });
      }

      const tasks = await processEmailWithAI(emailPayload.text, {
        assignmentOption: 'assignToMe',
        username: user.username
      });

      const createdTasks = [];
      for (const task of tasks) {
        const newTask = await storage.createTask({
          ...task,
          boardId: defaultBoard.id,
          userId: user.id,
          emailSource: emailPayload.text
        });
        createdTasks.push(newTask);
      }

      res.status(201).json({
        message: 'Test email processed successfully',
        tasks: createdTasks
      });
    } catch (error) {
      console.error('Error processing test email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        message: 'Failed to process test email',
        error: errorMessage 
      });
    }
  });

  // Real webhook handler for incoming emails
  app.post('/api/email/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    try {
      const email = new SendGridInbound.Parse(req.body);
      const emailPayload = {
        from: email.from.email,
        subject: email.subject,
        text: email.text || email.subject,
        html: email.html,
        timestamp: new Date().toISOString()
      };

      const user = await storage.getUserByEmail(emailPayload.from);
      if (!user) {
        return res.status(404).json({ message: 'User not found for this email' });
      }

      const boards = await storage.getBoardsByUserId(user.id);
      const defaultBoard = boards[0];

      if (!defaultBoard) {
        return res.status(404).json({ message: 'No boards found for user' });
      }

      const tasks = await processEmailWithAI(emailPayload.text, {
        assignmentOption: 'assignToMe',
        username: user.username
      });

      const createdTasks = [];
      for (const task of tasks) {
        const newTask = await storage.createTask({
          ...task,
          boardId: defaultBoard.id,
          userId: user.id,
          emailSource: emailPayload.text
        });
        createdTasks.push(newTask);
      }

      res.status(201).json({
        message: 'Email processed successfully',
        tasks: createdTasks
      });
    } catch (error) {
      console.error('Error processing email webhook:', error);
      res.status(500).json({ message: 'Failed to process email' });
    }
  });
}