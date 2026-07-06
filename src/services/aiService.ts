import { CATEGORIES } from '../constants/categories';
import { PRIORITIES } from '../constants/priorities';

export async function suggestCategory(description: string): Promise<string> {
  // Placeholder mock response
  console.log("Mock AI suggestCategory for:", description);
  return CATEGORIES.OTHERS;
}

export async function suggestPriority(description: string): Promise<string> {
  // Placeholder mock response
  console.log("Mock AI suggestPriority for:", description);
  return PRIORITIES.LOW;
}

export async function generateDescription(title: string): Promise<string> {
  // Placeholder mock response
  return `Mock generated description based on title: ${title}`;
}

export async function detectDuplicate(issueData: any): Promise<any[]> {
  // Placeholder mock response
  console.log("Mock AI detectDuplicate for issue:", issueData);
  return [];
}
