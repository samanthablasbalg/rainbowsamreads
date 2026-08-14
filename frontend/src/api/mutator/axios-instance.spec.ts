import { HttpResponse, http } from 'msw';
import { server } from '@/test/msw-server';
import { customInstance } from './axios-instance';

describe('customInstance', () => {
  it('resolves to the response body rather than the whole response', async () => {
    server.use(http.get('*/api/books', () => HttpResponse.json({ title: 'Piranesi' })));

    const body = await customInstance<{ title: string }>({ url: '/api/books', method: 'get' });

    expect(body).toEqual({ title: 'Piranesi' });
  });

  it('rejects when the request is refused', async () => {
    server.use(http.get('*/api/books', () => new HttpResponse(null, { status: 404 })));

    await expect(customInstance({ url: '/api/books', method: 'get' })).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  it('merges the second argument over the first', async () => {
    server.use(
      http.get('*/api/books', ({ request }) =>
        HttpResponse.json({ sentWith: request.headers.get('x-added-later') })
      )
    );

    // Orval passes per-call options here, so they have to win over the generated config.
    const body = await customInstance<{ sentWith: string }>(
      { url: '/api/books', method: 'get' },
      { headers: { 'x-added-later': 'yes' } }
    );

    expect(body.sentWith).toBe('yes');
  });
});
