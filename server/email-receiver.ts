import type { Express } from 'express';
import { storage } from './storage';
import { processEmailWithAI } from './openai';
import { MailService } from '@sendgrid/mail';
import * as SendGridInbound from '@sendgrid/inbound-mail-parser';
import express from 'express';

const SendGrid = new MailService();
SendGrid.setApiKey(process.env.SENDGRID_API_KEY || '');

// Configure SendGrid domain settings
const SENDGRID_PARSE_DOMAIN = process.env.SENDGRID_PARSE_DOMAIN || '';
if (!SENDGRID_PARSE_DOMAIN) {
  console.warn('Warning: SENDGRID_PARSE_DOMAIN environment variable is not set');
}

// Webhook handler for incoming emails
app.post('/api/email/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    const email = new SendGridInbound.Parse(req.body);

    // Extract email payload
    const emailPayload: EmailPayload = {
      from: email.from.email,
      subject: email.subject,
      text: email.text || email.subject,
      html: email.html,
      timestamp: new Date().toISOString()
    };

    // Find user by email address
    const user = await storage.getUserByEmail(emailPayload.from);
    if (!user) {
      return res.status(404).json({ message: 'User not found for this email' });
    }

    // Get user's default board
    const boards = await storage.getBoardsByUserId(user.id);
    const defaultBoard = boards[0];

    if (!defaultBoard) {
      return res.status(404).json({ message: 'No boards found for user' });
    }

    // Process email with AI
    const tasks = await processEmailWithAI(emailPayload.text, {
      assignmentOption: 'assignToMe',
      username: user.username
    });

    // Create tasks
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

}