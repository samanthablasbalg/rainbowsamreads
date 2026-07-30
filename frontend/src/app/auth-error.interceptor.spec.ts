import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authErrorInterceptor } from './auth-error.interceptor';
import { AuthService } from './auth.service';

describe('authErrorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let auth: AuthService;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
  });

  function signIn(): void {
    auth.checkSession().subscribe();
    httpTesting.expectOne('/api/auth/me').flush({ id: 'user-1', email: 'me@example.com' });
  }

  it('clears the session and redirects to the landing page on a 401', () => {
    signIn();
    const failed = vi.fn();

    http.get('/api/books').subscribe({ error: failed });
    httpTesting.expectOne('/api/books').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.currentUser()).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledWith('/');
    expect(failed).toHaveBeenCalled();
  });

  it('leaves the session alone on a non-401 error', () => {
    signIn();

    http.get('/api/books').subscribe({ error: vi.fn() });
    httpTesting.expectOne('/api/books').flush(null, { status: 500, statusText: 'Server Error' });

    expect(auth.currentUser()).not.toBeNull();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('ignores a 401 from the session endpoints, which answer 401 when anonymous', () => {
    auth.checkSession().subscribe();
    httpTesting.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not redirect on a successful response', () => {
    http.get('/api/books').subscribe();
    httpTesting.expectOne('/api/books').flush([]);

    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
