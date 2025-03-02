/**
 * Mock Exa API responses for tests
 */

export const mockExaSearchResponse = {
  results: [
    {
      id: 'result-1',
      title: 'Test Article 1',
      url: 'https://example.com/article1',
      contents: 'This is the first test article with some content that can be analyzed.',
      published_date: '2023-01-15',
      author: 'Test Author 1',
      score: 0.95
    },
    {
      id: 'result-2',
      title: 'Test Article 2',
      url: 'https://example.com/article2',
      contents: 'This is the second test article with different content for testing purposes.',
      published_date: '2023-02-10',
      author: 'Test Author 2',
      score: 0.85
    },
    {
      id: 'result-3',
      title: 'Test Article 3',
      url: 'https://example.com/article3',
      contents: 'This is the third test article that contradicts some information in the first article.',
      published_date: '2023-03-05',
      author: 'Test Author 3',
      score: 0.75
    }
  ],
  hits: 3,
  next_page_token: null
};

export const mockExaErrorResponse = {
  error: {
    message: 'API Error: Invalid request',
    code: 'invalid_request',
    status: 400
  }
};

export const mockExaRateLimitResponse = {
  error: {
    message: 'API Error: Rate limit exceeded',
    code: 'rate_limited',
    status: 429
  }
};

export const mockExtractionResults = {
  facts: [
    {
      fact: 'The market for renewable energy grew by 15% in 2022',
      type: 'statement',
      confidence: 0.92,
      entities: ['renewable energy', 'market']
    },
    {
      fact: 'Solar panel efficiency has improved from 15% to 22% in the past five years',
      type: 'statement',
      confidence: 0.89,
      entities: ['solar panel', 'efficiency']
    },
    {
      fact: 'Government subsidies have been a key driver of clean energy adoption',
      type: 'statement',
      confidence: 0.85,
      entities: ['government subsidies', 'clean energy']
    }
  ],
  confidence: 0.88
};