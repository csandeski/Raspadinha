/**
 * Extracts the message value from a JSON response object
 * Supports common keys: error, success, message, info, warning, description
 */
export function extractMessage(data: any): string {
  // If it's already a string, return it
  if (typeof data === 'string') {
    return data;
  }
  
  // If it's an object, look for common message keys
  if (data && typeof data === 'object') {
    // Priority order for message keys
    const messageKeys = ['error', 'success', 'message', 'info', 'warning', 'description', 'msg'];
    
    for (const key of messageKeys) {
      if (data[key] && typeof data[key] === 'string') {
        return data[key];
      }
    }
    
    // If no common key found but object has only one string property, use it
    const keys = Object.keys(data);
    if (keys.length === 1 && typeof data[keys[0]] === 'string') {
      return data[keys[0]];
    }
  }
  
  // Fallback to stringifying if no message found
  return typeof data === 'object' ? JSON.stringify(data) : String(data);
}

/**
 * Processes API response to extract clean message
 */
export function processApiResponse(response: any): any {
  // For error responses, extract the message
  if (response && typeof response === 'object' && ('error' in response || 'message' in response)) {
    const message = extractMessage(response);
    
    // Return a new object with the extracted message
    return {
      ...response,
      displayMessage: message
    };
  }
  
  return response;
}