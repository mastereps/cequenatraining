import {
  createBook,
  listBooksForAdmin,
  setBookActive,
  updateBook,
} from "../services/bookService.js";
import { isAppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

const handleError = (res, error, context) => {
  if (isAppError(error)) {
    logger.warn("book_request_rejected", {
      context,
      status: error.status,
      message: error.message,
    });
    return res.status(error.status).json({ error: error.message });
  }

  logger.error("book_request_failed", { context, error });
  return res.status(500).json({ error: "Internal server error." });
};

export const listAdminBooksController = async (_req, res) => {
  try {
    const books = await listBooksForAdmin();
    return res.json({ books });
  } catch (error) {
    return handleError(res, error, "list_admin_books");
  }
};

export const createBookController = async (req, res) => {
  try {
    const book = await createBook(req.body);
    logger.info("book_created", { id: book.id, slug: book.slug });
    return res.status(201).json({ book });
  } catch (error) {
    return handleError(res, error, "create_book");
  }
};

export const updateBookController = async (req, res) => {
  try {
    const book = await updateBook(req.params.id, req.body);
    logger.info("book_updated", { id: book.id, slug: book.slug });
    return res.json({ book });
  } catch (error) {
    return handleError(res, error, "update_book");
  }
};

export const archiveBookController = async (req, res) => {
  try {
    const book = await setBookActive(req.params.id, false);
    logger.info("book_archived", { id: book.id, slug: book.slug });
    return res.json({ book });
  } catch (error) {
    return handleError(res, error, "archive_book");
  }
};

export const restoreBookController = async (req, res) => {
  try {
    const book = await setBookActive(req.params.id, true);
    logger.info("book_restored", { id: book.id, slug: book.slug });
    return res.json({ book });
  } catch (error) {
    return handleError(res, error, "restore_book");
  }
};

export const uploadBookImageController = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "An image file is required." });
  }

  logger.info("book_image_uploaded", {
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });

  return res.status(201).json({ url: `/api/uploads/${req.file.filename}` });
};
