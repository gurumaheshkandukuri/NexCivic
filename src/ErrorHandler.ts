import { FirebaseError } from 'firebase/app';

const AUTH_ERROR_MESSAGES: { [key: string]: string } = {
  'auth/user-not-found': 'No account found with this email. Please sign up.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'This email is already registered. Please sign in.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters long.',
  'auth/network-request-failed': 'Network error. Please check your internet connection.',
  'auth/popup-closed-by-user': 'Google Sign-In was cancelled. Please try again.',
  'auth/cancelled-popup-request': 'Google Sign-In was cancelled. Please try again.',
};

export const getAuthErrorMessage = (error: any): string => {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] || 'An unexpected authentication error occurred. Please try again.';
  }
  return error.message || 'An unknown error occurred.';
};
