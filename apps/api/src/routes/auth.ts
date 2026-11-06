import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import {
  registerSchema,
  verifyEmailSchema,
  emailOnlySchema,
  loginSchema,
} from '@repo/shared';
import { getDb } from '../db';
import { createRawToken, hashToken } from '../utils/tokens';
import { sendMail } from '../utils/mailer';

const router = Router();
const WEB_URL = process.env.WEB_URL || 'http://localhost:5173';

router.post('/register', async (req: Request, res: Response): Promise<any> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration input' });
  }

  try {
    const db = getDb();
    const email = parsed.data.email.toLowerCase();

    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const result = await db.collection('users').insertOne({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email,
      passwordHash,
      emailVerified: false,
      totalPoints: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      createdAt: new Date(),
    });

    const rawToken = createRawToken();
    await db.collection('tokens').insertOne({
      userId: result.insertedId,
      type: 'verify',
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const link = `${WEB_URL}/verify-email?token=${rawToken}`;
    await sendMail(email, 'Verify your email', `<p>Click <a href="${link}">${link}</a> to verify your email.</p>`);

    return res.status(201).json({ message: 'Account created. Check your email to verify.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.post('/verify-email', async (req: Request, res: Response): Promise<any> => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    const db = getDb();
    const tokenDoc = await db.collection('tokens').findOne({
      type: 'verify',
      tokenHash: hashToken(parsed.data.token),
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(tokenDoc.userId) },
      { $set: { emailVerified: true } }
    );
    await db.collection('tokens').deleteOne({ _id: tokenDoc._id });

    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.post('/resend-verification', async (req: Request, res: Response): Promise<any> => {
  const parsed = emailOnlySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const db = getDb();
    const email = parsed.data.email.toLowerCase();
    const user = await db.collection('users').findOne({ email });

    if (user && !user.emailVerified) {
      await db.collection('tokens').deleteMany({ userId: user._id, type: 'verify' });
      const rawToken = createRawToken();
      await db.collection('tokens').insertOne({
        userId: user._id,
        type: 'verify',
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const link = `${WEB_URL}/verify-email?token=${rawToken}`;
      await sendMail(email, 'Verify your email', `<p>Click <a href="${link}">${link}</a> to verify your email.</p>`);
    }

    return res.status(200).json({ message: 'Verification email sent if account is unverified' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<any> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  try {
    const db = getDb();
    const email = parsed.data.email.toLowerCase();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Account email is not verified' });
    }

    const secret = process.env.ACCESS_TOKEN_SECRET!;
    const accessToken = jwt.sign({ userId: user._id.toString() }, secret, { expiresIn: '24h' });

    return res.status(200).json({
      accessToken,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        totalPoints: user.totalPoints,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
