import { CATEGORIES } from '../constants/categories';
import { PRIORITIES } from '../constants/priorities';

export async function suggestCategory(description: string): Promise<string> {
  // Placeholder mock response

  return CATEGORIES.OTHERS;
}

export async function suggestPriority(description: string): Promise<string> {
  // Placeholder mock response

  return PRIORITIES.LOW;
}

export async function generateDescription(title: string): Promise<string> {
  // Placeholder mock response
  return `Mock generated description based on title: ${title}`;
}

export async function detectDuplicate(issueData: any): Promise<any[]> {
  // Placeholder mock response

  return [];
}
