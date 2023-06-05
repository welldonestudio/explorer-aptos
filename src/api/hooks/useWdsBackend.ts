import {useCallback} from "react";

const useWdsBackend = () => {
  const url = "https://api.welldonestudio.io/compiler";

  return useCallback(
    async (method: string, path: string, query?: string, options?: Object) => {
      console.log("method", method, " path", path, " query", query);
      const res = await fetch(`${url}/${path}?${query}`, options);
      if (!res.ok) {
        throw new Error("Unexpected response");
      }
      return res.json();
    },
  );
};

export default useWdsBackend;
