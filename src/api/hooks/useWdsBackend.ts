import {useCallback} from "react";

const useWdsBackend = () => {
  return useCallback(
    async (path: string, query?: string, where?: string, options?: Object) => {
      let url = "https://api.welldonestudio.io/compiler";
      if (where === "load") {
        // url = 'http://wds-compiler-api-74546356.us-east-2.elb.amazonaws.com:8000';
      }
      // console.log(`${url}/${path}?${query}`);
      const res = await fetch(`${url}/${path}?${query}`, options);
      if (!res.ok) {
        throw new Error("Unexpected response");
      }
      return res.json();
    },
    [],
  ); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useWdsBackend;
