import { auth } from './firebase';

/** Send the current signed Firebase identity to private server endpoints. */
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again.');
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
