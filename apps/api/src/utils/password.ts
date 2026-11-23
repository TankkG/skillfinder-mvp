import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

export const PASSWORD_POLICY_MESSAGE =
  'La contrasena debe tener al menos 8 caracteres, una mayuscula, una minuscula y un numero.';

export const isStrongPassword = (value: string): boolean =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
