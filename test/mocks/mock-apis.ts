import { jest } from '@jest/globals';

export class MockExaAPI {
  search = jest.fn().mockResolvedValue({
    results: [
      {
        title: 'Sample Search Result',
        url: 'https://example.com/sample',
        text: 'This is a sample search result for testing purposes.',
        score: 0.95,
        publishedDate: '2024-01-01',
      },
      {
        title: 'Another Search Result',
        url: 'https://example.com/another',
        text: 'Another sample result with different content.',
        score: 0.87,
        publishedDate: '2024-01-02',
      },
    ],
    query: 'test query',
    autopromptString: 'Enhanced query for better results',
  });

  searchAndContents = jest.fn().mockResolvedValue({
    results: [
      {
        title: 'Sample Result with Content',
        url: 'https://example.com/content',
        text: 'Preview text',
        score: 0.92,
        publishedDate: '2024-01-01',
        content: 'Full content of the article for analysis...',
      },
    ],
    query: 'test query',
    autopromptString: 'Enhanced query',
  });

  findSimilar = jest.fn().mockResolvedValue({
    results: [
      {
        title: 'Similar Content',
        url: 'https://example.com/similar',
        text: 'Content similar to the provided URL',
        score: 0.89,
        publishedDate: '2024-01-03',
      },
    ],
  });
}

export const mockFetch = jest.fn();

export const createMockFetchResponse = (data: any, status: number = 200, ok: boolean = true) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Map([['content-type', 'application/json']]),
  });
};

export const setupMockFetch = () => {
  global.fetch = mockFetch;
  
  // Default successful response
  mockFetch.mockResolvedValue(createMockFetchResponse({ success: true }));
  
  return {
    mockResponse: (data: any, status?: number, ok?: boolean) => {
      mockFetch.mockResolvedValueOnce(createMockFetchResponse(data, status, ok));
    },
    mockError: (error: Error) => {
      mockFetch.mockRejectedValueOnce(error);
    },
    reset: () => {
      mockFetch.mockClear();
    },
  };
};

export class MockFileSystem {
  private files = new Map<string, string>();

  readFile = jest.fn((path: string) => {
    if (this.files.has(path)) {
      return Promise.resolve(this.files.get(path));
    }
    return Promise.reject(new Error(`File not found: ${path}`));
  });

  writeFile = jest.fn((path: string, content: string) => {
    this.files.set(path, content);
    return Promise.resolve();
  });

  exists = jest.fn((path: string) => {
    return Promise.resolve(this.files.has(path));
  });

  mkdir = jest.fn(() => Promise.resolve());
  
  rmdir = jest.fn(() => Promise.resolve());

  // Test utilities
  addFile(path: string, content: string) {
    this.files.set(path, content);
  }

  getFile(path: string) {
    return this.files.get(path);
  }

  clear() {
    this.files.clear();
  }
}

export class MockProcess {
  stdout = {
    write: jest.fn(),
    on: jest.fn(),
  };
  
  stderr = {
    write: jest.fn(),
    on: jest.fn(),
  };
  
  stdin = {
    on: jest.fn(),
    end: jest.fn(),
  };

  on = jest.fn();
  kill = jest.fn();
  
  exitCode: number | null = null;
  
  // Simulate process completion
  simulateExit(code: number, signal?: string) {
    this.exitCode = code;
    const exitCallback = this.on.mock.calls.find(call => call[0] === 'exit')?.[1];
    if (exitCallback) {
      exitCallback(code, signal);
    }
  }

  simulateError(error: Error) {
    const errorCallback = this.on.mock.calls.find(call => call[0] === 'error')?.[1];
    if (errorCallback) {
      errorCallback(error);
    }
  }

  simulateOutput(data: string, stream: 'stdout' | 'stderr' = 'stdout') {
    this[stream].write(data);
    const dataCallback = this[stream].on.mock.calls.find(call => call[0] === 'data')?.[1];
    if (dataCallback) {
      dataCallback(data);
    }
  }
}