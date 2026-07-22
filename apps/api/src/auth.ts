import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
export type AuthRequest = Request & { user?: { id: string; role: Role; name: string } };
const secret = () => process.env.JWT_SECRET || 'development-only-secret';
export const signToken = (user: { id: string; role: Role; name: string }) => jwt.sign(user, secret(), { expiresIn: '8h' });
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) { const value = req.headers.authorization?.replace('Bearer ', ''); if (!value) return res.status(401).json({ error: 'Authentication required' }); try { req.user = jwt.verify(value, secret()) as AuthRequest['user']; next(); } catch { res.status(401).json({ error: 'Invalid or expired session' }); } }
export const allow = (...roles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction) => !req.user || !roles.includes(req.user.role) ? res.status(403).json({ error: 'You do not have permission for this action' }) : next();
