import {useCallback} from "react";

const useWdsBackend = () => {
  const url = "https://api.welldonestudio.io/compiler";

  return useCallback(async (path: string, query?: string, options?: Object) => {
    const res = await fetch(`${url}/${path}?${query}`, options);
    if (!res.ok) {
      throw new Error("Unexpected response");
    }
    return res.json();
  });
};

export default useWdsBackend;
