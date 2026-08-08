import Axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

// No baseURL: the generated URLs already carry the /api prefix, and the browser
// reaches both the app and the API through the same Caddy origin.
//
// It is an instance rather than bare axios so there is somewhere for interceptors
// to attach later without touching call sites.
export const axiosInstance = Axios.create();

// Orval calls this in place of axios for every generated operation. Returning
// `data` rather than the whole AxiosResponse is the point: it flattens the hooks'
// result from `AxiosResponse<AuthMe200>` to `AuthMe200`, so call sites read
// `data.email` instead of `data.data.email`.
//
// React Query passes its own AbortSignal through `config`, which axios honours, so
// no cancellation plumbing is needed here.
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<T> => axiosInstance({ ...config, ...options }).then(({ data }) => data);

// Picked up by orval for the hooks' TError type parameter.
export type ErrorType<Error> = AxiosError<Error>;
