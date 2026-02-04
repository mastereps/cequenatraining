import { pool } from "../db.js";
import { AppError } from "../utils/errors.js";
import { hashPassword, verifyPassword } from "../utils/passwords.js";
import { isValidEmail, normalizeEmail, sanitizeText } from "../utils/validation.js";

const mapUser = (row) => ({
  id: Number(row.id),
  name: row.name,
  email: row.email,
  role: row.role || "customer",
  created_at: row.created_at,
});

export const getUserById = async (id) => {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError(400, "Invalid user id.");
  }

  const result = await pool.query(
    `
      SELECT id, name, email, role, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "User not found.");
  }

  return mapUser(result.rows[0]);
};

export const registerUser = async ({ name, email, password }) => {
  const cleanName = sanitizeText(name, 120);
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || "");

  if (cleanName.length < 2) {
    throw new AppError(400, "Name is required.");
  }
  if (!isValidEmail(cleanEmail)) {
    throw new AppError(400, "A valid email is required.");
  }
  if (cleanPassword.length < 8) {
    throw new AppError(400, "Password must be at least 8 characters.");
  }

  const passwordHash = hashPassword(cleanPassword);

  try {
    const result = await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, 'customer')
        RETURNING id, name, email, role, created_at
      `,
      [cleanName, cleanEmail, passwordHash],
    );
    return mapUser(result.rows[0]);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new AppError(409, "This email is already registered.");
    }
    throw error;
  }
};

export const loginUser = async ({ email, password }) => {
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || "");

  if (!isValidEmail(cleanEmail)) {
    throw new AppError(400, "A valid email is required.");
  }
  if (!cleanPassword) {
    throw new AppError(400, "Password is required.");
  }

  const result = await pool.query(
    `
      SELECT id, name, email, role, created_at, password_hash
      FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [cleanEmail],
  );

  const user = result.rows[0];
  if (!user || !verifyPassword(cleanPassword, user.password_hash)) {
    throw new AppError(401, "Invalid email or password.");
  }

  return mapUser(user);
};
