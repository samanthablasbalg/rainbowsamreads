import Axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

// No baseURL: the generated URLs already carry the /api prefix, and the app and the API
// share a Caddy origin.
export const axiosInstance = Axios.create();

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<T> => axiosInstance({ ...config, ...options }).then(({ data }) => data);

export type ErrorType<Error> = AxiosError<Error>;
