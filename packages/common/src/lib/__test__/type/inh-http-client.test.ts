import { InhHttpClient,InhHttpResponse, InhHttpRequestConfig } from '../../type/inh-http-client';

const MockHttpClient = jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {}
    }),
    post: jest.fn().mockResolvedValue({
        data: {},
        status: 201,
        statusText: 'Created',
        headers: {}
    }),
    put: jest.fn().mockResolvedValue({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {}
    }),
    delete: jest.fn().mockResolvedValue({
        data: {},
        status: 204,
        statusText: 'No Content',
        headers: {}
    }),
    patch: jest.fn().mockResolvedValue({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {}
    })
}));

describe('InhHttpClient', () => {
  let client: InhHttpClient;

  beforeEach(() => {
    client = new MockHttpClient();
  });

  test('should perform GET request', async () => {
    const response = await client.get('https://example.com');
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
  });

  test('should perform POST request', async () => {
    const response = await client.post('https://example.com', { key: 'value' });
    expect(response.status).toBe(201);
    expect(response.statusText).toBe('Created');
  });

  test('should perform PUT request', async () => {
    const response = await client.put('https://example.com', { key: 'value' });
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
  });

  test('should perform DELETE request', async () => {
    const response = await client.delete('https://example.com');
    expect(response.status).toBe(204);
    expect(response.statusText).toBe('No Content');
  });

  test('should perform DELETE request with body', async () => {
    const response = await client.delete('https://example.com', { data: { key: 'value' } });
    expect(response.status).toBe(204);
    expect(response.statusText).toBe('No Content');
  });
  test('should perform PATCH request', async () => {
    const response = await client.patch('https://example.com', { key: 'value' });
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
  });
});



describe('InhHttpResponse', () => {
  test('should create a valid InhHttpResponse object', () => {
    const response: InhHttpResponse<string> = {
      data: 'test data',
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    expect(response.data).toBe('test data');
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(response.headers).toEqual({
      'Content-Type': 'application/json'
    });
  });
});

describe('InhHttpRequestConfig', () => {
  test('should create a valid InhHttpRequestConfig object', () => {
    const config: InhHttpRequestConfig = {
      headers: {
        'Authorization': 'Bearer token'
      },
      params: {
        key: 'value'
      },
      timeout: 5000,
      responseType: 'json'
    };

    expect(config.headers).toEqual({
      'Authorization': 'Bearer token'
    });
    expect(config.params).toEqual({
      key: 'value'
    });
    expect(config.timeout).toBe(5000);
    expect(config.responseType).toBe('json');
  });
});