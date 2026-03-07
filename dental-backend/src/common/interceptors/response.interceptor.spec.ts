import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor.js';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;
  const mockContext = {} as any;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should wrap plain data in { success: true, data }', (done) => {
    const handler = { handle: () => of({ id: '1', name: 'Test' }) };

    interceptor.intercept(mockContext, handler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: { id: '1', name: 'Test' },
      });
      done();
    });
  });

  it('should wrap null data', (done) => {
    const handler = { handle: () => of(null) };

    interceptor.intercept(mockContext, handler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: null,
      });
      done();
    });
  });

  it('should wrap array data', (done) => {
    const handler = { handle: () => of([{ id: '1' }, { id: '2' }]) };

    interceptor.intercept(mockContext, handler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: [{ id: '1' }, { id: '2' }],
      });
      done();
    });
  });

  it('should extract paginated result into { success, data, meta }', (done) => {
    const paginated = {
      data: [{ id: '1' }],
      meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
    };
    const handler = { handle: () => of(paginated) };

    interceptor.intercept(mockContext, handler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: [{ id: '1' }],
        meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
      });
      done();
    });
  });

  it('should wrap string data', (done) => {
    const handler = { handle: () => of('hello') };

    interceptor.intercept(mockContext, handler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: 'hello',
      });
      done();
    });
  });
});
