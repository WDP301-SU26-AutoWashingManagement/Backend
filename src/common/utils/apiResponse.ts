import { Response } from 'express';

export const sendSuccess   = <T>(res: Response, data: T, message = 'Success', code = 200) =>
  res.status(code).json({ success: true, message, data });

export const sendCreated   = <T>(res: Response, data: T, message = 'Created') =>
  sendSuccess(res, data, message, 201);

export const sendNoContent = (res: Response) => res.status(204).send();

export const sendPaginated = <T>(res: Response, result: { docs: T[]; totalDocs: number; limit: number; page: number; totalPages: number }, message = 'Success') =>
  res.status(200).json({ success: true, message, data: result.docs, pagination: { totalDocs: result.totalDocs, limit: result.limit, page: result.page, totalPages: result.totalPages } });

export const sendError     = (res: Response, message = 'Error', code = 500, errors?: unknown) =>
  res.status(code).json({ success: false, message, errors });